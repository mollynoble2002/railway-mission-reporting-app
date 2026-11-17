import { liveQuery } from 'dexie';
import { db, type RMDatabase } from '../data/db';
import { createOutboxRepository, type OutboxRepository } from '../data/repositories/outbox';
import { createReportRepository, type ReportRepository } from '../data/repositories/reports';
import { seedSyntheticDataIfEmpty } from '../data/seed/syntheticSeed';
import { SimulatedTransport, SIMULATION_MODES, type SimulationMode } from './transport/SimulatedTransport';
import { createSyncStore, type SyncStore } from './syncStore';
import { SyncEngine } from './syncEngine';

const MODE_KEY = 'rm-prototype:simulation-mode';

/** Read the saved simulation mode. Storage may be blocked, so every access is guarded. */
function loadSavedMode(): SimulationMode {
  try {
    const saved = window.localStorage.getItem(MODE_KEY);
    if (saved && (SIMULATION_MODES as readonly string[]).includes(saved)) return saved as SimulationMode;
  } catch {
    // Storage unavailable (private mode or blocked). Fall back to the default.
  }
  return 'online';
}

function saveMode(mode: SimulationMode): void {
  try {
    window.localStorage.setItem(MODE_KEY, mode);
  } catch {
    // Non-essential. The mode simply will not persist across reloads.
  }
}

export interface SyncRuntime {
  db: RMDatabase;
  reports: ReportRepository;
  outbox: OutboxRepository;
  transport: SimulatedTransport;
  store: SyncStore;
  engine: SyncEngine;
  setSimulationMode(mode: SimulationMode): void;
  dispose(): void;
}

/**
 * Wire the database, transport, status store and engine together. Called once at startup.
 * This is the only module that knows about all of them at once.
 */
export async function startSyncRuntime(database: RMDatabase = db): Promise<SyncRuntime> {
  await seedSyntheticDataIfEmpty(database);

  const transport = new SimulatedTransport();
  const initialMode = loadSavedMode();
  transport.setMode(initialMode);

  const store = createSyncStore({
    deviceOnline: navigator.onLine && initialMode !== 'offline',
    simulationMode: initialMode,
    sendInFlight: false,
    pendingCount: 0,
    lastAttemptOutcome: 'none',
    paused: false,
  });

  const outbox = createOutboxRepository(database);
  const reports = createReportRepository(database);
  const engine = new SyncEngine({ db: database, outbox, transport, store });

  // Ask the browser to keep this origin's storage. Advisory only: the browser may refuse.
  void navigator.storage?.persist?.().catch(() => undefined);

  const unsubscribeMode = transport.subscribe((mode) => {
    saveMode(mode);
    store.update({ simulationMode: mode, deviceOnline: navigator.onLine && mode !== 'offline' });
    if (mode !== 'offline') void engine.runOnce('came_online');
  });

  // Keep pendingCount live from the database, whatever wrote to it (any tab, any screen).
  const countSub = liveQuery(() => outbox.pendingCount()).subscribe({
    next: (count) => store.update({ pendingCount: count }),
    error: () => {
      // Count is informational; the UI falls back to showing no count.
    },
  });

  await engine.start();

  return {
    db: database,
    reports,
    outbox,
    transport,
    store,
    engine,
    setSimulationMode(mode) {
      transport.setMode(mode);
    },
    dispose() {
      unsubscribeMode();
      countSub.unsubscribe();
      engine.stop();
    },
  };
}
