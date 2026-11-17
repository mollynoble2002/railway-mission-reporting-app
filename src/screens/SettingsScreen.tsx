import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRuntime, useSyncSnapshot } from '../app/RuntimeContext';
import { listAuditEvents } from '../data/repositories/audit';
import { resetToSyntheticData, SYNTHETIC_REPORTER_ID } from '../data/seed/syntheticSeed';
import { SIMULATION_LABELS, SIMULATION_MODES, type SimulationMode } from '../sync/transport/SimulatedTransport';
import { Card, PageTitle, formatTime } from '../ui/components';

export function SettingsScreen() {
  const rt = useRuntime();
  const snapshot = useSyncSnapshot();
  const [persisted, setPersisted] = useState<string>('Checking…');
  const [armedReset, setArmedReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const audit = useLiveQuery(() => listAuditEvents(rt.db, 15), [rt]);

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const ok = (await navigator.storage?.persisted?.()) ?? false;
        if (active) setPersisted(ok ? 'Granted' : 'Not granted. The browser may clear this device’s data under pressure.');
      } catch {
        if (active) setPersisted('Unavailable in this browser');
      }
    };
    void check();
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <PageTitle>Settings</PageTitle>

      <Card>
        <h2>Connection simulation</h2>
        <p className="muted small">
          For demonstrating offline behaviour only. Changes how the prototype behaves, not the real network.
        </p>
        <fieldset className="radio-group">
          <legend className="visually-hidden">Simulated connection</legend>
          {SIMULATION_MODES.map((mode: SimulationMode) => (
            <label key={mode} className={`radio-row${snapshot.simulationMode === mode ? ' is-checked' : ''}`}>
              <input
                type="radio"
                name="simulation"
                value={mode}
                checked={snapshot.simulationMode === mode}
                onChange={() => rt.setSimulationMode(mode)}
              />
              <span>{SIMULATION_LABELS[mode]}</span>
            </label>
          ))}
        </fieldset>
        <button type="button" className="btn btn--secondary" onClick={() => void rt.engine.runOnce('manual')} disabled={!snapshot.deviceOnline}>
          Send queued reports now
        </button>
      </Card>

      <Card>
        <h2>Status</h2>
        <dl className="answers">
          <div className="answers__row">
            <dt>Device reports online</dt>
            <dd>{snapshot.deviceOnline ? 'Yes' : 'No'}</dd>
          </div>
          <div className="answers__row">
            <dt>Last server confirmation</dt>
            <dd>{snapshot.lastSuccessAt ? formatTime(snapshot.lastSuccessAt) : 'None this session'}</dd>
          </div>
          <div className="answers__row">
            <dt>Last error code</dt>
            <dd>{snapshot.lastErrorCode ?? 'None'}</dd>
          </div>
          <div className="answers__row">
            <dt>Storage kept by browser</dt>
            <dd>{persisted}</dd>
          </div>
          <div className="answers__row">
            <dt>Synthetic chaplain profile</dt>
            <dd>
              Demo chaplain A <span className="muted">({SYNTHETIC_REPORTER_ID.slice(-4)})</span>
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2>Demo data</h2>
        <p className="muted small">
          Erases everything on this device and reloads the synthetic examples. Anything not yet confirmed by the server
          will be lost.
        </p>
        {resetDone ? <p role="status">Reset complete. Synthetic examples reloaded.</p> : null}
        <button
          type="button"
          className={`btn btn--danger-quiet${armedReset ? ' is-armed' : ''}`}
          onClick={() => {
            if (!armedReset) {
              setArmedReset(true);
              setResetDone(false);
              return;
            }
            void resetToSyntheticData(rt.db).then(() => {
              setArmedReset(false);
              setResetDone(true);
            });
          }}
        >
          {armedReset ? 'Tap again to erase and reload demo data' : 'Reset demo data'}
        </button>
      </Card>

      <Card>
        <h2>Recent device activity</h2>
        <p className="muted small">Codes only. No report content is recorded here.</p>
        {audit === undefined ? (
          <p className="muted">Loading…</p>
        ) : audit.length === 0 ? (
          <p className="muted">No activity yet.</p>
        ) : (
          <ol className="audit-list">
            {audit.map((event) => (
              <li key={event.id}>
                <code>{event.action}</code>
                {event.code ? <> · {event.code}</> : null}
                <span className="muted"> · {formatTime(event.at)}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </>
  );
}
