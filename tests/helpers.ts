import { RMDatabase } from '../src/data/db';
import { createOutboxRepository } from '../src/data/repositories/outbox';
import { createReportRepository } from '../src/data/repositories/reports';
import { SyncEngine } from '../src/sync/syncEngine';
import { createSyncStore } from '../src/sync/syncStore';
import { SimulatedTransport } from '../src/sync/transport/SimulatedTransport';
import type { SyncTransport } from '../src/sync/transport/types';

let counter = 0;

/** A fresh, isolated IndexedDB database per test (fake-indexeddb). */
export function freshDb(): RMDatabase {
  counter += 1;
  return new RMDatabase(`test-db-${counter}-${Date.now()}`);
}

/** Wires repositories, a store and an engine around a given transport, with a controllable clock. */
export function buildHarness(db: RMDatabase, transport: SyncTransport, clock: { now: number }) {
  const outbox = createOutboxRepository(db);
  const reports = createReportRepository(db);
  const store = createSyncStore({
    deviceOnline: true,
    simulationMode: 'online',
    sendInFlight: false,
    pendingCount: 0,
    lastAttemptOutcome: 'none',
    paused: false,
  });
  const engine = new SyncEngine({
    db,
    outbox,
    transport,
    store,
    now: () => clock.now,
    random: () => 0.5,
    tickMs: 1_000_000,
  });
  return { db, outbox, reports, store, engine };
}

/** A fast simulated transport: no real sleeping, deterministic randomness. */
export function fastTransport(random = () => 0.9): SimulatedTransport {
  return new SimulatedTransport({ latencyMs: 0, random, sleep: () => Promise.resolve() });
}

export const VALID_SUPPORT_ANSWERS = {
  interactionDate: '2026-11-14',
  locationText: 'SYNTHETIC: Test Platform 3',
  interactionType: 'type_a',
  supportNotes: 'SYNTHETIC: test note',
};
