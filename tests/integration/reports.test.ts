import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { RMDatabase } from '../../src/data/db';
import { RepositoryError } from '../../src/data/repositories/reports';
import { resetToSyntheticData, seedSyntheticDataIfEmpty, SYNTHETIC_REPORTER_ID } from '../../src/data/seed/syntheticSeed';
import { reportPayloadHash } from '../../src/domain/payload';
import { freshDb, buildHarness, fastTransport, VALID_SUPPORT_ANSWERS } from '../helpers';

describe('report repository and local persistence', () => {
  let db: RMDatabase;

  beforeEach(() => {
    db = freshDb();
  });

  afterEach(async () => {
    db.close();
    await db.delete();
  });

  it('persists a draft across a database reopen (survives app close or restart)', async () => {
    const h = buildHarness(db, fastTransport(), { now: Date.now() });
    const draft = await h.reports.createDraft('support_interaction', SYNTHETIC_REPORTER_ID);
    await h.reports.saveDraft(draft.id, VALID_SUPPORT_ANSWERS);

    const name = db.name;
    db.close();
    const reopened = new (await import('../../src/data/db')).RMDatabase(name);
    const restored = await reopened.reports.get(draft.id);
    expect(restored?.lifecycle).toBe('draft');
    expect(restored?.answers).toEqual(VALID_SUPPORT_ANSWERS);
    expect(restored?.revision).toBe(1);
    reopened.close();
    db = reopened;
  });

  it('increments the revision on each saved edit', async () => {
    const h = buildHarness(db, fastTransport(), { now: Date.now() });
    const draft = await h.reports.createDraft('btp_visit', SYNTHETIC_REPORTER_ID);
    await h.reports.saveDraft(draft.id, { visitDate: '2026-11-01' });
    const second = await h.reports.saveDraft(draft.id, { visitDate: '2026-11-02' });
    expect(second.revision).toBe(2);
  });

  it('completing a draft queues it and does NOT mark it submitted', async () => {
    const h = buildHarness(db, fastTransport(), { now: Date.now() });
    const draft = await h.reports.createDraft('support_interaction', SYNTHETIC_REPORTER_ID);
    await h.reports.saveDraft(draft.id, VALID_SUPPORT_ANSWERS);
    const hash = await reportPayloadHash({ kind: draft.kind, schemaVersion: 0, answers: VALID_SUPPORT_ANSWERS });
    await h.reports.completeAndQueue(draft.id, 1, hash);

    const after = await db.reports.get(draft.id);
    const entry = await db.outbox.get(draft.id);
    expect(after?.lifecycle).toBe('completed');
    expect(after?.receiptId).toBeUndefined();
    expect(entry?.state).toBe('waiting_to_sync');
    expect(entry?.payloadHash).toBe(hash);
  });

  it('refuses to complete if the revision moved on after validation (stale completion)', async () => {
    const h = buildHarness(db, fastTransport(), { now: Date.now() });
    const draft = await h.reports.createDraft('btp_visit', SYNTHETIC_REPORTER_ID);
    await h.reports.saveDraft(draft.id, { visitDate: '2026-11-01' });
    await expect(h.reports.completeAndQueue(draft.id, 0, 'x')).rejects.toMatchObject({ code: 'STALE_REVISION' });
    expect((await db.reports.get(draft.id))?.lifecycle).toBe('draft');
    expect(await db.outbox.count()).toBe(0);
  });

  it('a completed report is read-only: it cannot be edited as a draft', async () => {
    const h = buildHarness(db, fastTransport(), { now: Date.now() });
    const draft = await h.reports.createDraft('btp_visit', SYNTHETIC_REPORTER_ID);
    await h.reports.saveDraft(draft.id, { visitDate: '2026-11-01' });
    await h.reports.completeAndQueue(draft.id, 1, 'h');
    await expect(h.reports.saveDraft(draft.id, { visitDate: '2026-12-01' })).rejects.toBeInstanceOf(RepositoryError);
  });

  it('can withdraw an unsent report back to draft, removing it from the queue', async () => {
    const h = buildHarness(db, fastTransport(), { now: Date.now() });
    const draft = await h.reports.createDraft('btp_visit', SYNTHETIC_REPORTER_ID);
    await h.reports.saveDraft(draft.id, { visitDate: '2026-11-01' });
    await h.reports.completeAndQueue(draft.id, 1, 'h');
    await h.reports.returnToDraft(draft.id);
    expect((await db.reports.get(draft.id))?.lifecycle).toBe('draft');
    expect(await db.outbox.get(draft.id)).toBeUndefined();
  });

  it('can discard a draft but not a queued report', async () => {
    const h = buildHarness(db, fastTransport(), { now: Date.now() });
    const draft = await h.reports.createDraft('btp_visit', SYNTHETIC_REPORTER_ID);
    await h.reports.discardDraft(draft.id);
    expect(await db.reports.get(draft.id)).toBeUndefined();

    const queued = await h.reports.createDraft('btp_visit', SYNTHETIC_REPORTER_ID);
    await h.reports.saveDraft(queued.id, { visitDate: '2026-11-01' });
    await h.reports.completeAndQueue(queued.id, 1, 'h');
    await expect(h.reports.discardDraft(queued.id)).rejects.toBeInstanceOf(RepositoryError);
  });

  it('every record created in the prototype is flagged synthetic', async () => {
    const h = buildHarness(db, fastTransport(), { now: Date.now() });
    const draft = await h.reports.createDraft('btp_visit', SYNTHETIC_REPORTER_ID);
    expect(draft.isSynthetic).toBe(true);
    await seedSyntheticDataIfEmpty(db);
    const all = await db.reports.toArray();
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((r) => r.isSynthetic === true)).toBe(true);
  });

  it('seeds the synthetic examples exactly once', async () => {
    expect(await seedSyntheticDataIfEmpty(db)).toBe(true);
    const first = await db.reports.count();
    expect(await seedSyntheticDataIfEmpty(db)).toBe(false);
    expect(await db.reports.count()).toBe(first);
  });

  it('reset restores the synthetic examples and removes local work', async () => {
    await seedSyntheticDataIfEmpty(db);
    const h = buildHarness(db, fastTransport(), { now: Date.now() });
    await h.reports.createDraft('btp_visit', SYNTHETIC_REPORTER_ID);
    await resetToSyntheticData(db);
    const drafts = await db.reports.where('lifecycle').equals('draft').toArray();
    expect(drafts.every((d) => d.id.startsWith('00000000-0000-4000-8000-0000000000'))).toBe(true);
  });
});
