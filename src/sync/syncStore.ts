import type { SyncErrorCode } from '../domain/types';
import type { SimulationMode } from './transport/SimulatedTransport';

export interface SyncSnapshot {
  /** navigator.onLine combined with the simulated "no connection" setting. */
  deviceOnline: boolean;
  simulationMode: SimulationMode;
  sendInFlight: boolean;
  /** Outbox entries not yet acknowledged by the server. */
  pendingCount: number;
  lastAttemptOutcome: 'ok' | 'failed' | 'none';
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  lastErrorCode?: SyncErrorCode;
  /** Set when the server reported the session is no longer valid. Sending pauses until resumed. */
  paused: boolean;
}

export type SyncStore = ReturnType<typeof createSyncStore>;

/** A tiny external store (no state library), read with useSyncExternalStore. */
export function createSyncStore(initial: SyncSnapshot) {
  let snapshot: SyncSnapshot = initial;
  const listeners = new Set<() => void>();
  return {
    getSnapshot(): SyncSnapshot {
      return snapshot;
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    update(patch: Partial<SyncSnapshot>): void {
      const next = { ...snapshot, ...patch };
      if (shallowEqual(next, snapshot)) return;
      snapshot = next;
      for (const listener of listeners) listener();
    },
  };
}

function shallowEqual(a: object, b: object): boolean {
  const ka = Object.keys(a) as (keyof typeof a)[];
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => a[k] === (b as Record<string, unknown>)[k as string]);
}
