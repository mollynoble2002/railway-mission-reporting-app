import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { startSyncRuntime, type SyncRuntime } from '../sync/runtime';
import type { SyncSnapshot } from '../sync/syncStore';

const RuntimeContext = createContext<SyncRuntime | null>(null);

/**
 * One runtime per page load. Shared promise, so React StrictMode's double-mounting in development
 * cannot create two engines or two simulated servers.
 */
let runtimePromise: Promise<SyncRuntime> | null = null;
function getRuntimeOnce(): Promise<SyncRuntime> {
  runtimePromise ??= startSyncRuntime();
  return runtimePromise;
}

export function RuntimeProvider({ children }: { children: ReactNode }) {
  const [runtime, setRuntime] = useState<SyncRuntime | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getRuntimeOnce()
      .then((rt) => {
        if (active) setRuntime(rt);
      })
      .catch(() => {
        // The message is deliberately generic. Do not log details that could contain content.
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (failed) {
    return (
      <div className="fatal" role="alert">
        <h1>The app could not start on this device</h1>
        <p>Local storage is not available. Try closing other tabs, then reload. Nothing has been sent.</p>
      </div>
    );
  }

  if (!runtime) {
    return (
      <div className="loading" role="status" aria-live="polite">
        Starting the prototype…
      </div>
    );
  }

  return <RuntimeContext.Provider value={runtime}>{children}</RuntimeContext.Provider>;
}

export function useRuntime(): SyncRuntime {
  const rt = useContext(RuntimeContext);
  if (!rt) throw new Error('useRuntime must be used inside RuntimeProvider after startup');
  return rt;
}

export function useSyncSnapshot(): SyncSnapshot {
  const rt = useRuntime();
  return useSyncExternalStore(
    (listener) => rt.store.subscribe(listener),
    () => rt.store.getSnapshot(),
  );
}
