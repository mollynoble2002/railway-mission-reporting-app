import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRuntime } from '../app/RuntimeContext';
import type { ReportRecord } from '../domain/types';
import { getFormDefinition } from '../domain/formDefinitions';
import { Card, PageTitle, ReportStatusChip, formatTime } from '../ui/components';

/**
 * Lists only reports the server has acknowledged (lifecycle === 'submitted').
 * Nothing on this screen is shown as submitted unless it has a receipt.
 */
export function SubmittedScreen() {
  const rt = useRuntime();
  const reports = useLiveQuery(
    () => rt.db.reports.where('lifecycle').equals('submitted').toArray(),
    [rt],
  );

  if (reports === undefined) return <p className="muted">Loading…</p>;

  const sorted = [...reports]
    .filter((r): r is ReportRecord & { receiptId: string } => typeof r.receiptId === 'string' && r.receiptId !== '')
    .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''));

  return (
    <>
      <PageTitle>Submitted reports</PageTitle>
      <p className="muted small">
        These have been confirmed by the server. They are read-only on this device.
      </p>

      {sorted.length === 0 ? (
        <Card>
          <p>No reports have been confirmed by the server yet.</p>
          <Link className="btn btn--secondary" to="/unsent">
            View drafts and waiting reports
          </Link>
        </Card>
      ) : (
        <ul className="report-list">
          {sorted.map((report) => (
            <li key={report.id} className="report-row">
              <Link className="report-row__main" to={`/reports/${report.id}`}>
                <span className="report-row__title">{getFormDefinition(report.kind)?.shortTitle ?? 'Report'}</span>
                <span className="report-row__meta">
                  Submitted {formatTime(report.submittedAt)} · Ref {report.receiptId}
                </span>
                <ReportStatusChip state="submitted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
