import { Link, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRuntime, useSyncSnapshot } from '../app/RuntimeContext';
import type { OutboxRecord, ReportRecord } from '../domain/types';
import { getFormDefinition } from '../domain/formDefinitions';
import { displayStateFor, type DisplayState } from '../domain/status';
import { Card, PageTitle, ReportStatusChip, formatTime } from '../ui/components';
import { useState } from 'react';

interface Row {
  report: ReportRecord;
  outbox: OutboxRecord | undefined;
  state: DisplayState;
}

type Section = { key: string; title: string; hint: string; rows: Row[] };

export function UnsentScreen() {
  const rt = useRuntime();
  const snapshot = useSyncSnapshot();
  const location = useLocation();
  const justQueued = (location.state as { justQueued?: boolean } | null)?.justQueued === true;

  const rows = useLiveQuery(async (): Promise<Row[]> => {
    const reports = await rt.db.reports.where('lifecycle').anyOf(['draft', 'completed']).toArray();
    const outbox = await rt.db.outbox.bulkGet(reports.map((r) => r.id));
    return reports
      .map((report, i) => {
        const entry = outbox[i];
        return { report, outbox: entry, state: displayStateFor(report.lifecycle, entry) };
      })
      .sort((a, b) => b.report.updatedAt.localeCompare(a.report.updatedAt));
  }, [rt]);

  if (rows === undefined) return <p className="muted">Loading…</p>;

  const sections: Section[] = [
    {
      key: 'attention',
      title: 'Needs attention',
      hint: 'The server could not accept these. Withdraw one to edit it.',
      rows: rows.filter((r) => r.state === 'needs_attention'),
    },
    {
      key: 'retry',
      title: 'Not sent yet',
      hint: 'These will be sent automatically when the connection allows.',
      rows: rows.filter((r) => r.state === 'retry_scheduled'),
    },
    {
      key: 'waiting',
      title: 'Waiting to send',
      hint: 'Saved on this device. Not submitted until the server confirms.',
      rows: rows.filter((r) => r.state === 'waiting_to_sync' || r.state === 'sending'),
    },
    {
      key: 'drafts',
      title: 'Drafts',
      hint: 'Only on this device. Finish them, then queue them for sending.',
      rows: rows.filter((r) => r.state === 'saved_locally'),
    },
  ];

  // Something can be sent now only if it is waiting or retrying. Needs-attention items need a person.
  const anyPending = rows.some((r) => r.state === 'waiting_to_sync' || r.state === 'retry_scheduled');
  const canSendNow = snapshot.deviceOnline && anyPending;

  return (
    <>
      <PageTitle>Drafts and waiting to send</PageTitle>
      <NetworkLine />

      {justQueued ? (
        <div className="notice notice--info" role="status">
          Queued. It will send automatically when the connection allows. It is not submitted yet.
        </div>
      ) : null}

      <div className="action-bar">
        <button
          type="button"
          className="btn btn--primary"
          disabled={!canSendNow}
          onClick={() => void rt.engine.runOnce('manual')}
        >
          Send all now
        </button>
      </div>
      {!snapshot.deviceOnline ? (
        <p className="muted small">No connection. Reports will send when the device is back online.</p>
      ) : null}

      {rows.length === 0 ? (
        <Card>
          <p>Nothing is waiting on this device.</p>
          <Link className="btn btn--secondary" to="/">
            Home
          </Link>
        </Card>
      ) : null}

      {sections
        .filter((s) => s.rows.length > 0)
        .map((section) => (
          <section key={section.key} className="section" aria-labelledby={`sec-${section.key}`}>
            <h2 id={`sec-${section.key}`}>
              {section.title} <span className="count">({section.rows.length})</span>
            </h2>
            <p className="muted small">{section.hint}</p>
            <ul className="report-list">
              {section.rows.map((row) => (
                <ReportRow key={row.report.id} row={row} canSendNow={snapshot.deviceOnline} />
              ))}
            </ul>
          </section>
        ))}
    </>
  );
}

function NetworkLine() {
  const snapshot = useSyncSnapshot();
  return (
    <p className="muted small" role="status">
      {snapshot.deviceOnline ? 'Connected.' : 'No connection.'}{' '}
      {snapshot.lastSuccessAt ? `Last confirmed by server: ${formatTime(snapshot.lastSuccessAt)}.` : ''}
    </p>
  );
}

function ReportRow({ row, canSendNow }: { row: Row; canSendNow: boolean }) {
  const rt = useRuntime();
  const def = getFormDefinition(row.report.kind);
  const [armed, setArmed] = useState(false);
  const showSend = canSendNow && (row.state === 'retry_scheduled' || row.state === 'waiting_to_sync');

  return (
    <li className="report-row">
      <Link className="report-row__main" to={`/reports/${row.report.id}`}>
        <span className="report-row__title">{def?.shortTitle ?? 'Report'}</span>
        <span className="report-row__meta">Last changed {formatTime(row.report.updatedAt)}</span>
        <ReportStatusChip state={row.state} />
      </Link>
      <div className="report-row__actions">
        {showSend ? (
          <button type="button" className="btn btn--secondary" onClick={() => void rt.engine.sendNow(row.report.id)}>
            Send now
          </button>
        ) : null}
        {row.state === 'saved_locally' ? (
          <button
            type="button"
            className={`btn btn--danger-quiet${armed ? ' is-armed' : ''}`}
            onClick={() => {
              if (!armed) {
                setArmed(true);
                return;
              }
              void rt.reports.discardDraft(row.report.id).catch(() => undefined);
            }}
          >
            {armed ? 'Tap again to discard' : 'Discard'}
          </button>
        ) : null}
      </div>
    </li>
  );
}
