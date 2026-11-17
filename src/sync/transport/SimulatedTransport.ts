import { TransportError, type SubmitEnvelope, type SubmitReceipt, type SyncTransport } from './types';

/**
 * PROTOTYPE ONLY: an in-process stand-in for the Railway Mission server.
 *
 * Nothing leaves the browser. The "server" is a Map in memory, so receipts are lost on reload.
 * It implements the production contract so the sync engine is exercised realistically:
 * - idempotency on clientId (same payload → same receipt, never a duplicate);
 * - 409-style conflict when the same clientId arrives with a different payload;
 * - "response lost" in flaky mode, where the server stores the report but the client sees a
 *   timeout. The retry then proves that idempotency prevents a duplicate.
 */

export type SimulationMode = 'online' | 'offline' | 'flaky' | 'failing';

export const SIMULATION_MODES: readonly SimulationMode[] = ['online', 'offline', 'flaky', 'failing'];

export const SIMULATION_LABELS: Record<SimulationMode, string> = {
  online: 'Online',
  offline: 'No connection',
  flaky: 'Flaky connection',
  failing: 'Server failing',
};

interface ServerRecord {
  payloadHash: string;
  receiptId: string;
  receivedAt: string;
}

export interface SimulatedTransportOptions {
  /** Base latency for a successful request, ms. */
  latencyMs?: number;
  /** Source of randomness. Injected in tests. */
  random?: () => number;
  /** Clock. Injected in tests. */
  now?: () => string;
  /** Sleep. Injected in tests so they do not wait. */
  sleep?: (ms: number) => Promise<void>;
}

export class SimulatedTransport implements SyncTransport {
  private mode: SimulationMode = 'online';
  private readonly server = new Map<string, ServerRecord>();
  private readonly listeners = new Set<(mode: SimulationMode) => void>();
  private receiptCounter = 0;
  private readonly latencyMs: number;
  private readonly random: () => number;
  private readonly now: () => string;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(options: SimulatedTransportOptions = {}) {
    this.latencyMs = options.latencyMs ?? 600;
    this.random = options.random ?? Math.random;
    this.now = options.now ?? (() => new Date().toISOString());
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  getMode(): SimulationMode {
    return this.mode;
  }

  setMode(mode: SimulationMode): void {
    if (mode === this.mode) return;
    this.mode = mode;
    for (const listener of this.listeners) listener(mode);
  }

  subscribe(listener: (mode: SimulationMode) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Number of distinct reports the simulated server holds. Used by tests and the demo. */
  storedCount(): number {
    return this.server.size;
  }

  async ping(): Promise<boolean> {
    await this.sleep(50);
    return this.mode !== 'offline';
  }

  async submit(envelope: SubmitEnvelope): Promise<SubmitReceipt> {
    if (this.mode === 'offline') {
      await this.sleep(50);
      throw new TransportError('NETWORK');
    }

    await this.sleep(this.latencyMs + Math.floor(this.random() * 400));

    if (this.mode === 'failing') {
      throw new TransportError('SERVER_5XX');
    }

    // Idempotency: a repeat of a known clientId returns the original receipt, or conflicts.
    const existing = this.server.get(envelope.clientId);
    if (existing) {
      if (existing.payloadHash !== envelope.payloadHash) throw new TransportError('CONFLICT');
      return { receiptId: existing.receiptId, receivedAt: existing.receivedAt };
    }

    if (this.mode === 'flaky') {
      const roll = this.random();
      if (roll < 0.4) throw new TransportError('NETWORK');
      if (roll < 0.55) {
        // The server stores the report, but the response is lost on the way back.
        this.store(envelope);
        throw new TransportError('TIMEOUT');
      }
    }

    const record = this.store(envelope);
    return { receiptId: record.receiptId, receivedAt: record.receivedAt };
  }

  private store(envelope: SubmitEnvelope): ServerRecord {
    this.receiptCounter += 1;
    const suffix = Math.floor(this.random() * 0xffffff).toString(16).padStart(6, '0');
    const record: ServerRecord = {
      payloadHash: envelope.payloadHash,
      receiptId: `SIM-RCPT-${String(this.receiptCounter).padStart(4, '0')}-${suffix}`,
      receivedAt: this.now(),
    };
    this.server.set(envelope.clientId, record);
    return record;
  }
}
