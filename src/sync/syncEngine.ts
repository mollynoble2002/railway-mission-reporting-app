import type { OutboxRecord, SyncErrorCode } from '../domain/types';
import type { RMDatabase } from '../data/db';
import type { OutboxRepository } from '../data/repositories/outbox';
import { logEvent } from '../lib/log';
import { nowIso } from '../lib/ids';
import { DEFAULT_BACKOFF, nextDelayMs, type BackoffPolicy } from './backoff';
import { TransportError, type SyncTransport } from './transport/types';
import type { SyncStore } from './syncStore';

export type SyncTrigger = 'app_start' | 'came_online' | 'visible' | 'timer' | 'after_save' | 'manual' | 'resume';

export interface SyncEngineOptions {
  db: RMDatabase;
  outbox: OutboxRepository;
  transport: SyncTransport;
  store: SyncStore;
  backoff?: BackoffPolicy;
  now?: () => number;
  random?: () => number;
  /** Interval for re-checking the queue while the app is open. */
  tickMs?: number;
}

/**
 * Sends queued reports to the server.
 *
 * Guarantees:
 * - a report is marked submitted only after a receipt is returned (via outbox.acknowledge);
 * - only one run at a time per tab, and only one tab at a time when Web Locks is available;
 * - interrupted sends are recovered on start, which is safe because the server is idempotent;
 * - nothing is deleted automatically. Non-retryable failures go to needs_attention.
 */
export class SyncEngine {
  private readonly opts: Required<Omit<SyncEngineOptions, 'db' | 'outbox' | 'transport' | 'store'>> & SyncEngineOptions;
  private current: Promise<void> | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly detach: Array<() => void> = [];

  constructor(options: SyncEngineOptions) {
    this.opts = {
      backoff: DEFAULT_BACKOFF,
      now: () => Date.now(),
      random: Math.random,
      tickMs: 5_000,
      ...options,
    };
  }

  /** Attach browser triggers and recover anything interrupted last time. */
  async start(): Promise<void> {
    await this.opts.outbox.recoverInterrupted();
    const onOnline = () => {
      this.refreshDeviceOnline();
      void this.runOnce('came_online');
    };
    const onOffline = () => {
      this.opts.store.update({ deviceOnline: false });
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void this.runOnce('visible');
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisible);
    this.detach.push(
      () => window.removeEventListener('online', onOnline),
      () => window.removeEventListener('offline', onOffline),
      () => document.removeEventListener('visibilitychange', onVisible),
    );
    this.timer = setInterval(() => {
      void this.runOnce('timer');
    }, this.opts.tickMs);
    void this.runOnce('app_start');
  }

  stop(): void {
    for (const fn of this.detach.splice(0)) fn();
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }

  /**
   * The status store is the single source of truth for connectivity. The browser's online/offline
   * events and the simulated "no connection" setting both feed into it.
   */
  refreshDeviceOnline(): void {
    const simulatedOffline = this.opts.store.getSnapshot().simulationMode === 'offline';
    this.opts.store.update({ deviceOnline: navigator.onLine && !simulatedOffline });
  }

  /** Make a retry-scheduled report due now and send it. */
  async sendNow(clientId: string): Promise<void> {
    await this.opts.outbox.makeDueNow(clientId);
    await this.runOnce('manual');
  }

  /** Clear a paused state (after the person re-authenticates) and resume sending. */
  async resume(): Promise<void> {
    this.opts.store.update({ paused: false });
    await this.runOnce('resume');
  }

  /**
   * Run one drain of the queue. Concurrent calls share the same run. If another tab holds the
   * sync lock, this call does nothing and the other tab does the work.
   */
  runOnce(trigger: SyncTrigger): Promise<void> {
    if (this.current) return this.current;
    const run = this.withLock(() => this.drain(trigger)).finally(() => {
      this.current = null;
    });
    this.current = run;
    return run;
  }

  private async withLock(fn: () => Promise<void>): Promise<void> {
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
    if (!locks) return fn();
    await locks.request('rm-sync-runner', { ifAvailable: true }, async (lock) => {
      if (lock === null) return;
      await fn();
    });
  }

  private async drain(trigger: SyncTrigger): Promise<void> {
    if (this.opts.store.getSnapshot().paused && trigger !== 'resume') return;
    if (!this.opts.store.getSnapshot().deviceOnline) {
      logEvent('sync_skipped_offline');
      return;
    }

    // Loop until nothing is due, so one run sends everything that is ready.
    for (;;) {
      if (this.opts.store.getSnapshot().paused) break;
      if (!this.opts.store.getSnapshot().deviceOnline) break;
      const due = await this.opts.outbox.due(new Date(this.opts.now()).toISOString());
      const next = due[0];
      if (!next) break;
      await this.sendOne(next.clientId);
    }
    await this.refreshPendingCount();
  }

  private async sendOne(clientId: string): Promise<void> {
    const claimed = await this.opts.outbox.claim(clientId);
    if (!claimed) return;

    const report = await this.opts.db.reports.get(claimed.reportId);
    if (!report || report.lifecycle === 'draft') {
      // Should not happen: the report was withdrawn or discarded. Do not send.
      await this.opts.outbox.recordFailure(clientId, 'UNKNOWN', nowIso());
      return;
    }

    this.opts.store.update({ sendInFlight: true, lastAttemptAt: nowIso() });
    try {
      const receipt = await this.opts.transport.submit({
        clientId: claimed.clientId,
        kind: claimed.kind,
        revision: claimed.revision,
        schemaVersion: report.schemaVersion,
        payloadHash: claimed.payloadHash,
        payload: report.answers,
      });
      await this.opts.outbox.acknowledge(clientId, receipt.receiptId);
      this.opts.store.update({
        lastAttemptOutcome: 'ok',
        lastSuccessAt: receipt.receivedAt,
        lastErrorCode: undefined,
      });
      logEvent('sync_acknowledged');
    } catch (err) {
      const code: SyncErrorCode = err instanceof TransportError ? err.code : 'UNKNOWN';
      await this.handleFailure(claimed, code);
    } finally {
      this.opts.store.update({ sendInFlight: false });
    }
  }

  private async handleFailure(entry: OutboxRecord, code: SyncErrorCode): Promise<void> {
    if (code === 'AUTH_EXPIRED') {
      // Not the report's fault. Put it back in the queue untouched and stop sending.
      // It is due again as soon as sending is resumed, so no backoff is applied.
      await this.opts.outbox.recordFailure(entry.clientId, 'NETWORK', new Date(this.opts.now()).toISOString());
      this.opts.store.update({ paused: true, lastAttemptOutcome: 'failed', lastErrorCode: code });
      logEvent('sync_paused_auth');
      return;
    }
    const attempt = entry.attempts;
    const delay = nextDelayMs(attempt, this.opts.backoff, this.opts.random);
    const nextAt = new Date(this.opts.now() + delay).toISOString();
    await this.opts.outbox.recordFailure(entry.clientId, code, nextAt);
    this.opts.store.update({ lastAttemptOutcome: 'failed', lastErrorCode: code });
    logEvent('sync_failed', { code, attempt });
  }

  private async refreshPendingCount(): Promise<void> {
    this.opts.store.update({ pendingCount: await this.opts.outbox.pendingCount() });
  }
}
