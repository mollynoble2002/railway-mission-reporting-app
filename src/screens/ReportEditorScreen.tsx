import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Answers, FieldDefinition, FormDefinition, OutboxRecord, ReportRecord } from '../domain/types';
import { getFormDefinition } from '../domain/formDefinitions';
import { canReturnToDraft, displayStateFor } from '../domain/status';
import { reportPayloadHash } from '../domain/payload';
import { validateForCompletion, type FieldErrors } from '../domain/validation';
import { sanitiseAnswers } from '../lib/sanitise';
import { RepositoryError } from '../data/repositories/reports';
import { useRuntime } from '../app/RuntimeContext';
import { Card, PageTitle, ReportStatusChip, formatTime } from '../ui/components';
import { FormField } from '../ui/FormFields';

const AUTOSAVE_MS = 800;

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function ReportEditorScreen() {
  const { id = '' } = useParams();
  const rt = useRuntime();
  const navigate = useNavigate();

  const data = useLiveQuery(
    async () => ({
      report: (await rt.db.reports.get(id)) ?? null,
      outbox: (await rt.db.outbox.get(id)) ?? null,
    }),
    [id, rt],
  );

  if (data === undefined) return <p className="muted">Loading…</p>;
  if (data.report === null) {
    return (
      <Card>
        <h1>Report not found</h1>
        <p>It may have been discarded on this device.</p>
        <Link className="btn btn--secondary" to="/unsent">Back to unsent reports</Link>
      </Card>
    );
  }

  const def = getFormDefinition(data.report.kind);
  if (!def) {
    return (
      <Card>
        <h1>Unknown form</h1>
        <Link className="btn btn--secondary" to="/">Home</Link>
      </Card>
    );
  }

  if (data.report.lifecycle === 'draft') {
    return (
      <DraftEditor
        report={data.report}
        def={def}
        onQueued={() => navigate('/unsent', { state: { justQueued: true } })}
      />
    );
  }
  return <ReadOnlyReport report={data.report} outbox={data.outbox} def={def} />;
}

/* ------------------------------------------------------------------ */
/* Draft editor                                                        */
/* ------------------------------------------------------------------ */

function DraftEditor({
  report,
  def,
  onQueued,
}: {
  report: ReportRecord;
  def: FormDefinition;
  onQueued: () => void;
}) {
  const rt = useRuntime();
  const [answers, setAnswers] = useState<Answers>(() => report.answers);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [savedAt, setSavedAt] = useState<string | undefined>(report.updatedAt);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const latest = useRef<Answers>(report.answers);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  /** Persist the current answers if they have changed. Safe to call repeatedly. */
  const flush = useCallback(async (): Promise<void> => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (!dirty.current) return;
    dirty.current = false;
    setSaveStatus('saving');
    try {
      const saved = await rt.reports.saveDraft(report.id, sanitiseAnswers(def, latest.current));
      setSavedAt(saved.updatedAt);
      setSaveStatus('saved');
    } catch (err) {
      dirty.current = true;
      setSaveStatus('error');
      if (!(err instanceof RepositoryError)) throw err;
    }
  }, [rt, report.id, def]);

  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  // Flush any pending edit when leaving the screen, so typing is never lost.
  useEffect(() => {
    return () => {
      void flushRef.current().catch(() => undefined);
    };
  }, []);

  function handleChange(fieldId: string, value: Answers[string]) {
    setAnswers((prev) => {
      const next = { ...prev, [fieldId]: value };
      latest.current = next;
      return next;
    });
    dirty.current = true;
    setSaveStatus('idle');
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void flush().catch(() => undefined);
    }, AUTOSAVE_MS);
    if (errors[fieldId]) {
      setErrors((prev) => {
        const copy: FieldErrors = { ...prev };
        copy[fieldId] = undefined;
        return copy;
      });
    }
  }

  async function handleComplete() {
    if (busy) return; // Guard against double submission.
    setBusy(true);
    setFormError(null);
    try {
      await flush();
      const current = await rt.db.reports.get(report.id);
      if (!current || current.lifecycle !== 'draft') {
        setFormError('This report has already been completed.');
        return;
      }
      const cleaned = sanitiseAnswers(def, current.answers);
      const found = validateForCompletion(def, cleaned);
      if (found) {
        setErrors(found);
        setFormError('Please check the highlighted fields.');
        summaryRef.current?.focus();
        return;
      }
      const hash = await reportPayloadHash({ kind: current.kind, schemaVersion: current.schemaVersion, answers: cleaned });
      await rt.reports.completeAndQueue(current.id, current.revision, hash);
      void rt.engine.runOnce('after_save');
      onQueued();
    } catch (err) {
      if (err instanceof RepositoryError && err.code === 'STALE_REVISION') {
        setFormError('The report changed while you were sending it. Please check it and try again.');
      } else {
        setFormError('The report could not be completed. It is still saved on this device.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveNow() {
    if (timer.current !== null) clearTimeout(timer.current);
    dirty.current = true;
    await flush();
  }

  const errorCount = Object.keys(errors).length;

  return (
    <>
      <PageTitle>{def.title}</PageTitle>
      <p className="muted">{def.description}</p>

      {def.fieldSource === 'placeholder' ? (
        <div className="notice notice--warn" role="note">
          <strong>Placeholder fields.</strong> These are not the official form questions yet. Railway Mission has not
          supplied them. Do not enter real information.
        </div>
      ) : null}

      {formError || errorCount > 0 ? (
        <div className="notice notice--error" role="alert" ref={summaryRef} tabIndex={-1}>
          <strong>{formError ?? 'Please check the form.'}</strong>
          {errorCount > 0 ? (
            <ul>
              {def.fields
                .filter((f) => errors[f.id])
                .map((f) => (
                  <li key={f.id}>
                    <a href={`#f-${f.id}`}>{stripPlaceholderPrefix(f.label)}: {errors[f.id]}</a>
                  </li>
                ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          void handleComplete();
        }}
        noValidate
      >
        {def.fields.map((field: FieldDefinition) => (
          <FormField
            key={field.id}
            field={field}
            value={answers[field.id]}
            error={errors[field.id]}
            disabled={busy}
            onChange={(v) => handleChange(field.id, v)}
          />
        ))}

        <div className="save-line" aria-live="polite">
          {saveStatusText(saveStatus, savedAt)}
        </div>

        <div className="action-bar">
          <button type="button" className="btn btn--secondary" onClick={() => void handleSaveNow()} disabled={busy}>
            Save draft
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Working…' : 'Complete and queue for sending'}
          </button>
        </div>
        <p className="muted small">
          Queuing does not send the report instantly. It stays on this device until the server confirms it has been
          received.
        </p>
      </form>

      <DiscardDraft reportId={report.id} />
    </>
  );
}

function saveStatusText(status: SaveStatus, savedAt: string | undefined): string {
  switch (status) {
    case 'saving':
      return 'Saving on this device…';
    case 'saved':
      return `Saved on this device at ${formatTime(savedAt)}`;
    case 'error':
      return 'Could not save. Your entries are still on screen. Try “Save draft”.';
    case 'idle':
      return savedAt ? `Saved on this device at ${formatTime(savedAt)}` : 'Not saved yet';
  }
}

function stripPlaceholderPrefix(label: string): string {
  return label.replace('[PLACEHOLDER] ', '');
}

/* ------------------------------------------------------------------ */
/* Read-only view (completed, queued, needs attention, submitted)      */
/* ------------------------------------------------------------------ */

function ReadOnlyReport({
  report,
  outbox,
  def,
}: {
  report: ReportRecord;
  outbox: OutboxRecord | null;
  def: FormDefinition;
}) {
  const rt = useRuntime();
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);
  const state = displayStateFor(report.lifecycle, outbox ?? undefined);
  const withdrawable = report.lifecycle === 'completed' && canReturnToDraft(outbox?.state);

  async function withdraw() {
    setMessage(null);
    try {
      await rt.reports.returnToDraft(report.id);
      await navigate(`/reports/${report.id}`, { replace: true });
    } catch {
      setMessage('This report is being sent and cannot be changed right now.');
    }
  }

  return (
    <>
      <PageTitle>{def.title}</PageTitle>
      <div className="row-wrap">
        <ReportStatusChip state={state} />
        <span className="muted">Last changed {formatTime(report.updatedAt)}</span>
      </div>

      {report.lifecycle === 'submitted' ? (
        <div className="notice notice--ok" role="status">
          <strong>Submitted.</strong> The server confirmed it received this report at {formatTime(report.submittedAt)}.
          Submitted reports are read-only.
        </div>
      ) : (
        <div className="notice notice--info" role="status">
          {state === 'needs_attention'
            ? 'The server could not accept this report. It has not been submitted. Withdraw it to edit it.'
            : 'This report is not submitted yet. It is waiting on this device. It is read-only until you withdraw it.'}
        </div>
      )}

      {message ? <div className="notice notice--error" role="alert">{message}</div> : null}

      <Card>
        <dl className="answers">
          {def.fields.map((field) => (
            <div key={field.id} className="answers__row">
              <dt>{stripPlaceholderPrefix(field.label)}</dt>
              <dd>{formatAnswer(field, report.answers[field.id])}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {report.lifecycle === 'submitted' ? (
        <Card className="receipt">
          <h2>Server receipt</h2>
          <p>
            Reference: <code>{report.receiptId ?? 'not recorded'}</code>
          </p>
        </Card>
      ) : null}

      <div className="action-bar">
        {withdrawable ? (
          <button type="button" className="btn btn--secondary" onClick={() => void withdraw()}>
            Withdraw and edit
          </button>
        ) : null}
        <Link className="btn btn--primary" to="/">
          Home
        </Link>
      </div>
    </>
  );
}

function formatAnswer(field: FieldDefinition, value: Answers[string] | undefined): string {
  if (value === undefined || value === null || value === '') return '—';
  if (field.type === 'checkbox') return value === true ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    return value.map((v) => field.options?.find((o) => o.value === v)?.label ?? v).join(', ');
  }
  if (field.type === 'select') return field.options?.find((o) => o.value === value)?.label ?? String(value);
  return String(value);
}

/* ------------------------------------------------------------------ */
/* Discard with two-step confirmation (no browser dialogs)             */
/* ------------------------------------------------------------------ */

function DiscardDraft({ reportId }: { reportId: string }) {
  const rt = useRuntime();
  const navigate = useNavigate();
  const [armed, setArmed] = useState(false);
  return (
    <div className="discard">
      <button
        type="button"
        className={`btn btn--danger-quiet${armed ? ' is-armed' : ''}`}
        onClick={() => {
          if (!armed) {
            setArmed(true);
            return;
          }
          rt.reports
            .discardDraft(reportId)
            .then(() => navigate('/unsent'))
            .catch(() => setArmed(false));
        }}
      >
        {armed ? 'Tap again to permanently discard this draft' : 'Discard draft'}
      </button>
    </div>
  );
}
