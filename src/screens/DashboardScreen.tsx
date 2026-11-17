import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRuntime, useSyncSnapshot } from '../app/RuntimeContext';
import { Card, PageTitle, TileLink } from '../ui/components';

function summaryText(drafts: number, queued: number): string {
  const parts: string[] = [];
  if (drafts > 0) parts.push(drafts === 1 ? '1 draft' : `${drafts} drafts`);
  if (queued > 0) parts.push(`${queued} waiting to send or needing attention`);
  return `${parts.join(' · ')}. View`;
}

export function DashboardScreen() {
  const rt = useRuntime();
  const snapshot = useSyncSnapshot();
  const draftCount = useLiveQuery(() => rt.db.reports.where('lifecycle').equals('draft').count(), [rt]);

  const unsent = (draftCount ?? 0) + snapshot.pendingCount;

  return (
    <>
      <PageTitle>Home</PageTitle>

      {unsent > 0 ? (
        <Link className="unsent-summary" to="/unsent">
          {summaryText(draftCount ?? 0, snapshot.pendingCount)}
        </Link>
      ) : (
        <p className="muted">Nothing waiting on this device.</p>
      )}

      <nav aria-label="Start a task">
        <div className="tile-grid">
          <TileLink
            to="/incident/coming-soon"
            icon="!"
            title="Report an incident"
            description="Coming in a later phase"
          />
          <TileLink
            to="/new/support_interaction"
            icon="♡"
            title="Record a welfare interaction"
            description="Support Interaction Form"
          />
          <TileLink
            to="/visits/new"
            icon="→"
            title="Record a railway visit"
            description="BTP or Network Rail visit"
          />
          <TileLink to="/unsent" icon="◷" title="My drafts and waiting to send" description="Saved on this device" />
          <TileLink to="/submitted" icon="✓" title="Submitted reports" description="Confirmed by the server" />
        </div>
      </nav>

      <Card className="muted-card">
        <p className="small">
          Saved on this device means the report is not yet with Railway Mission. A report only counts as submitted once
          the server has confirmed receipt.
        </p>
      </Card>
    </>
  );
}
