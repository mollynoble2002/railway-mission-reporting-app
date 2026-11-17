import type { ISOInstant, OutboxRecord, SyncErrorCode, UUID } from '../../domain/types';
import { nowIso } from '../../lib/ids';
import type { RMDatabase } from '../db';
import { appendAudit } from './audit';

const SENDABLE = ['waiting_to_sync', 'retry_scheduled'] as const;

/** Errors that should be retried automatically. Everything else needs a human. */
export const RETRYABLE_CODES: ReadonlySet<SyncErrorCode> = new Set<SyncErrorCode>([
  'NETWORK',
  'TIMEOUT',
  'SERVER_5XX',
  'RATE_LIMITED',
  'UNKNOWN',
]);

/**
 * Outbox repository: the queue of reports waiting to be acknowledged by the server.
 * Every state change that touches a report's lifecycle is performed in one transaction.
 */
export function createOutboxRepository(db: RMDatabase) {
  return {
    list(): Promise<OutboxRecord[]> {
      return db.outbox.orderBy('createdAt').toArray();
    },

    async pendingCount(): Promise<number> {
      return db.outbox.where('state').noneOf(['submitted']).count();
    },

    get(clientId: UUID): Promise<OutboxRecord | undefined> {
      return db.outbox.get(clientId);
    },

    /** Entries eligible for an attempt now, oldest first. */
    async due(now: ISOInstant = nowIso()): Promise<OutboxRecord[]> {
      const candidates = await db.outbox.where('state').anyOf([...SENDABLE]).sortBy('createdAt');
      return candidates.filter((e) => e.nextAttemptAt === undefined || e.nextAttemptAt <= now);
    },

    /**
     * Atomically move an entry to `sending`. Returns undefined if another runner got there
     * first or the entry is no longer sendable, so the caller must not send.
     */
    async claim(clientId: UUID): Promise<OutboxRecord | undefined> {
      return db.transaction('rw', db.outbox, db.auditEvents, async () => {
        const entry = await db.outbox.get(clientId);
        if (!entry || !(SENDABLE as readonly string[]).includes(entry.state)) return undefined;
        const claimed: OutboxRecord = {
          ...entry,
          state: 'sending',
          attempts: entry.attempts + 1,
          lastAttemptAt: nowIso(),
          nextAttemptAt: undefined,
        };
        await db.outbox.put(claimed);
        await appendAudit(db, 'send_attempted', { reportId: entry.reportId });
        return claimed;
      });
    },

    /**
     * The ONLY place a report becomes "submitted". Requires a server receipt.
     * Writes the outbox entry and the report's lifecycle together.
     */
    async acknowledge(clientId: UUID, receiptId: string): Promise<void> {
      if (receiptId.length === 0) throw new Error('A server receipt is required to acknowledge');
      await db.transaction('rw', db.outbox, db.reports, db.auditEvents, async () => {
        const entry = await db.outbox.get(clientId);
        if (!entry) throw new Error('Outbox entry not found');
        const at = nowIso();
        await db.outbox.put({
          ...entry,
          state: 'submitted',
          receiptId,
          acknowledgedAt: at,
          nextAttemptAt: undefined,
          lastErrorCode: undefined,
        });
        const report = await db.reports.get(entry.reportId);
        if (report) {
          await db.reports.put({
            ...report,
            lifecycle: 'submitted',
            submittedAt: at,
            receiptId,
            updatedAt: at,
          });
        }
        await appendAudit(db, 'acknowledged', { reportId: entry.reportId, code: 'ok' });
      });
    },

    /**
     * Record a failed attempt. Retryable errors schedule another attempt at `nextAttemptAt`;
     * non-retryable errors move the entry to needs_attention, where nothing is sent again
     * until a person changes the report.
     */
    async recordFailure(
      clientId: UUID,
      code: SyncErrorCode,
      nextAttemptAt: ISOInstant,
    ): Promise<OutboxRecord | undefined> {
      return db.transaction('rw', db.outbox, db.auditEvents, async () => {
        const entry = await db.outbox.get(clientId);
        if (!entry) return undefined;
        const retryable = RETRYABLE_CODES.has(code);
        const updated: OutboxRecord = {
          ...entry,
          state: retryable ? 'retry_scheduled' : 'needs_attention',
          lastErrorCode: code,
          nextAttemptAt: retryable ? nextAttemptAt : undefined,
        };
        await db.outbox.put(updated);
        await appendAudit(db, retryable ? 'send_failed' : 'marked_needs_attention', {
          reportId: entry.reportId,
          code,
        });
        return updated;
      });
    },

    /** Make a retry-scheduled entry due immediately (user pressed "Send now"). */
    async makeDueNow(clientId: UUID): Promise<void> {
      await db.outbox.where('clientId').equals(clientId).and((e) => e.state === 'retry_scheduled').modify({
        nextAttemptAt: nowIso(),
      });
    },

    /**
     * On startup, an entry still marked `sending` means the app stopped mid-request. Return it
     * to the queue. Safe, because the server deduplicates on clientId.
     */
    async recoverInterrupted(): Promise<number> {
      return db.outbox.where('state').equals('sending').modify((e) => {
        e.state = 'retry_scheduled';
        e.nextAttemptAt = nowIso();
      });
    },
  };
}

export type OutboxRepository = ReturnType<typeof createOutboxRepository>;
