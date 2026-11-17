import type { Answers, ReportKind, ReportRecord, ReportLifecycle, UUID } from '../../domain/types';
import { canReturnToDraft } from '../../domain/status';
import { getFormDefinition } from '../../domain/formDefinitions';
import { newId, nowIso } from '../../lib/ids';
import type { RMDatabase } from '../db';
import { appendAudit } from './audit';

export class RepositoryError extends Error {
  constructor(
    message: string,
    readonly code: 'NOT_FOUND' | 'INVALID_STATE' | 'STALE_REVISION' | 'UNKNOWN_KIND',
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

/**
 * Report repository. All writes that change a report's lifecycle also write the matching
 * outbox or audit rows inside the same transaction.
 */
export function createReportRepository(db: RMDatabase) {
  return {
    async createDraft(kind: ReportKind, reporterId: string): Promise<ReportRecord> {
      const def = getFormDefinition(kind);
      if (!def) throw new RepositoryError(`Unknown report kind: ${kind}`, 'UNKNOWN_KIND');
      const now = nowIso();
      const record: ReportRecord = {
        id: newId(),
        kind,
        schemaVersion: def.schemaVersion,
        revision: 0,
        lifecycle: 'draft',
        answers: {},
        isSynthetic: true,
        reporterId,
        createdAt: now,
        updatedAt: now,
      };
      await db.transaction('rw', db.reports, db.auditEvents, async () => {
        await db.reports.add(record);
        await appendAudit(db, 'draft_created', { reportId: record.id });
      });
      return record;
    },

    get(id: UUID): Promise<ReportRecord | undefined> {
      return db.reports.get(id);
    },

    list(lifecycle?: ReportLifecycle): Promise<ReportRecord[]> {
      if (lifecycle) return db.reports.where('lifecycle').equals(lifecycle).reverse().sortBy('updatedAt');
      return db.reports.orderBy('updatedAt').reverse().toArray();
    },

    /**
     * Save answers to a draft. Increments the revision. Refuses to touch anything that is no
     * longer a draft: completed, queued and submitted reports are read-only.
     */
    async saveDraft(id: UUID, answers: Answers): Promise<ReportRecord> {
      return db.transaction('rw', db.reports, async () => {
        const current = await db.reports.get(id);
        if (!current) throw new RepositoryError('Report not found', 'NOT_FOUND');
        if (current.lifecycle !== 'draft') {
          throw new RepositoryError('Only drafts can be edited', 'INVALID_STATE');
        }
        const updated: ReportRecord = {
          ...current,
          answers,
          revision: current.revision + 1,
          updatedAt: nowIso(),
        };
        await db.reports.put(updated);
        return updated;
      });
    },

    /**
     * Mark a draft as completed and enqueue it for sending, atomically.
     * `expectedRevision` and `payloadHash` must have been computed from the same revision the
     * user validated. If the revision has moved on, the completion is refused.
     */
    async completeAndQueue(id: UUID, expectedRevision: number, payloadHash: string): Promise<ReportRecord> {
      return db.transaction('rw', db.reports, db.outbox, db.auditEvents, async () => {
        const current = await db.reports.get(id);
        if (!current) throw new RepositoryError('Report not found', 'NOT_FOUND');
        if (current.lifecycle !== 'draft') {
          throw new RepositoryError('Report is already completed', 'INVALID_STATE');
        }
        if (current.revision !== expectedRevision) {
          throw new RepositoryError('Report changed while being completed', 'STALE_REVISION');
        }
        const now = nowIso();
        const completed: ReportRecord = { ...current, lifecycle: 'completed', completedAt: now, updatedAt: now };
        await db.reports.put(completed);
        await db.outbox.put({
          clientId: current.id,
          reportId: current.id,
          kind: current.kind,
          revision: current.revision,
          payloadHash,
          state: 'waiting_to_sync',
          attempts: 0,
          createdAt: now,
        });
        await appendAudit(db, 'report_completed', { reportId: id });
        await appendAudit(db, 'queued', { reportId: id });
        return completed;
      });
    },

    /**
     * Withdraw a not-yet-sent report back to a draft so it can be edited. Removes its outbox
     * entry. Refused while a send is in flight or after acknowledgement.
     */
    async returnToDraft(id: UUID): Promise<ReportRecord> {
      return db.transaction('rw', db.reports, db.outbox, db.auditEvents, async () => {
        const current = await db.reports.get(id);
        if (!current) throw new RepositoryError('Report not found', 'NOT_FOUND');
        if (current.lifecycle !== 'completed') {
          throw new RepositoryError('Only unsent reports can be returned to draft', 'INVALID_STATE');
        }
        const entry = await db.outbox.get(id);
        if (!canReturnToDraft(entry?.state)) {
          throw new RepositoryError('This report is being sent and cannot be changed', 'INVALID_STATE');
        }
        await db.outbox.delete(id);
        const draft: ReportRecord = { ...current, lifecycle: 'draft', updatedAt: nowIso() };
        delete draft.completedAt;
        await db.reports.put(draft);
        await appendAudit(db, 'returned_to_draft', { reportId: id });
        return draft;
      });
    },

    /** Discard a draft that has never been queued. Submitted and queued reports cannot be discarded. */
    async discardDraft(id: UUID): Promise<void> {
      await db.transaction('rw', db.reports, db.auditEvents, async () => {
        const current = await db.reports.get(id);
        if (!current) return;
        if (current.lifecycle !== 'draft') {
          throw new RepositoryError('Only drafts can be discarded', 'INVALID_STATE');
        }
        await db.reports.delete(id);
        await appendAudit(db, 'draft_discarded');
      });
    },
  };
}

export type ReportRepository = ReturnType<typeof createReportRepository>;
