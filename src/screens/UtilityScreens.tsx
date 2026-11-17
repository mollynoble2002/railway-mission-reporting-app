import { useEffect, useRef } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useRuntime } from '../app/RuntimeContext';
import { REPORT_KINDS, getFormDefinition } from '../domain/formDefinitions';
import type { ReportKind } from '../domain/types';
import { URGENT_GUIDANCE } from '../config/guidance';
import { SYNTHETIC_REPORTER_ID } from '../data/seed/syntheticSeed';
import { Card, PageTitle } from '../ui/components';

/**
 * Urgent help. The content and contacts come from src/config/guidance.ts, which is marked as
 * prototype placeholder text until Railway Mission approves its own wording.
 */
export function UrgentHelpScreen() {
  const g = URGENT_GUIDANCE;
  return (
    <>
      <PageTitle>Urgent help</PageTitle>

      <div className="notice notice--warn" role="note">
        <strong>{g.status === 'approved' ? 'Approved guidance' : 'Prototype placeholder content. Not approved.'}</strong>
      </div>

      <Card>
        <p className="lead">{g.intro}</p>
        <ol className="steps">
          {g.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="disclaimer">{g.disclaimer}</p>
      </Card>

      <Card>
        <h2>Contacts</h2>
        <ul className="contact-list">
          {g.contacts.map((c) => (
            <li key={c.id} className="contact">
              <span className="contact__label">{c.label}</span>
              {c.number ? (
                <a className="btn btn--urgent" href={`tel:${c.number.replace(/\s+/g, '')}`}>
                  Call {c.number}
                </a>
              ) : (
                <span className="contact__missing">Not yet supplied</span>
              )}
              {c.note ? <span className="muted small">{c.note}</span> : null}
            </li>
          ))}
        </ul>
      </Card>

      <Link className="btn btn--secondary" to="/">
        Back to home
      </Link>
    </>
  );
}

export function ComingSoonScreen({ title }: { title: string }) {
  return (
    <>
      <PageTitle>{title}</PageTitle>
      <Card>
        <p>This workflow is not part of the current prototype phase.</p>
        <p className="muted small">If someone needs urgent help now, use Urgent help and follow established procedures.</p>
        <div className="action-bar">
          <Link className="btn btn--urgent" to="/help/urgent">
            Urgent help
          </Link>
          <Link className="btn btn--secondary" to="/">
            Home
          </Link>
        </div>
      </Card>
    </>
  );
}

export function VisitChooserScreen() {
  const kinds: ReportKind[] = ['btp_visit', 'network_rail_visit'];
  return (
    <>
      <PageTitle>Record a railway visit</PageTitle>
      <p className="muted">Choose the log to complete.</p>
      <div className="tile-grid">
        {kinds.map((kind) => {
          const def = getFormDefinition(kind);
          return (
            <Link key={kind} className="tile" to={`/new/${kind}`}>
              <span className="tile__icon" aria-hidden="true">→</span>
              <span className="tile__title">{def?.title}</span>
              <span className="tile__description">{def?.description}</span>
            </Link>
          );
        })}
      </div>
      <Link className="btn btn--secondary" to="/">
        Back
      </Link>
    </>
  );
}

/**
 * Creates a new draft for a form kind and replaces this route with the editor for it.
 * The ref guard stops React's development double-mount from creating two drafts.
 */
export function NewReportRedirect() {
  const { kind = '' } = useParams();
  const rt = useRuntime();
  const navigate = useNavigate();
  const started = useRef(false);

  const known = (REPORT_KINDS as string[]).includes(kind);

  useEffect(() => {
    if (!known || started.current) return;
    started.current = true;
    void rt.reports
      .createDraft(kind as ReportKind, SYNTHETIC_REPORTER_ID)
      .then((record) => navigate(`/reports/${record.id}`, { replace: true }));
  }, [known, kind, navigate, rt]);

  if (!known) return <Navigate to="/" replace />;
  return <p className="muted">Creating a draft on this device…</p>;
}

export function NotFoundScreen() {
  return (
    <Card>
      <h1>Page not found</h1>
      <Link className="btn btn--secondary" to="/">
        Home
      </Link>
    </Card>
  );
}
