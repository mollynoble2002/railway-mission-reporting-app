import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { RMDatabase } from '../../src/data/db';
import { SYNTHETIC_REPORTER_ID } from '../../src/data/seed/syntheticSeed';
import { reportPayloadHash } from '../../src/domain/payload';
import type { SyncErrorCode } from '../../src/domain/types';
import { SimulatedTransport } from '../../src/sync/transport/SimulatedTransport';
import { TransportError, type SubmitEnvelope, type SubmitReceipt, type SyncTransport } from '../../src/sync/transport/types';
import { freshDb, buildHarness, fastTransport, VALID_SUPPORT_ANSWERS } from '../helpers';

/** Create a draft, complete it, and queue it. Returns the report id. */
async function queueReport(h: ReturnType<typeof buildHarness>, answers = VALID_SUPPORT_ANSWERS): Promise<string> {
  const draft = await h.reports.createDraft('support_interaction', SYNTHETIC_REPORTER_ID);
  await h.reports.saveDraft(draft.id, answers);
  const hash = await reportPayloadHash({ kind: 'support_interaction', schemaVersion: 0, answers });
  await h.reports.completeAndQueue(draft.id, 1, hash);
  return draft.id;
}

/** A transport whose behaviour is scripted per call. */
class ScriptedTransport implements SyncTransport {
  calls: SubmitEnvelope[] = [];
  constructor(private readonly script: Array<SyncErrorCode | 'ok'>) {}
  async submit(envelope: SubmitEnvelope): Promise<SubmitReceipt> {
    this.calls.push(envelope);
    const next = this.script.shift() ?? 'ok';
    if (next === 'ok') return { receiptId: `RCPT-${this.calls.length}`, receivedAt: new Date().toISOString() };
    throw new TransportError(next);
  }
  async ping(): Promise<boolean> {
    return true;
  }
}

describe('sync engine', () => {
  let db: RMDatabase;
  let clock: { now: number };

  beforeEach(() => {
    db = freshDb();
    // Start from real time so timestamps written by recovery code (which uses the wall clock) are comparable.
    clock = { now: Date.now() };
  });

  afterEach(async () => {
    db.close();
    await db.delete();
  });

  it('marks a report submitted only after the server returns a receipt', async () => {
    const h = buildHarness(db, fastTransport(), clock);
    const id = await queueReport(h);
    await h.engine.runOnce('manual');

    const report = await db.reports.get(id);
    const entry = await db.outbox.get(id);
    expect(report?.lifecycle).toBe('submitted');
    expect(report?.receiptId).toMatch(/^SIM-RCPT-/);
    expect(entry?.state).toBe('submitted');
    expect(entry?.receiptId).toBe(report?.receiptId);
  });

  it('does not mark anything submitted while the device is offline', async () => {
    const h = buildHarness(db, fastTransport(), clock);
    const id = await queueReport(h);
    h.store.update({ deviceOnline: false });
    await h.engine.runOnce('manual');

    expect((await db.reports.get(id))?.lifecycle).toBe('completed');
    expect((await db.outbox.get(id))?.state).toBe('waiting_to_sync');
    expect(h.store.getSnapshot().sendInFlight).toBe(false);
  });

  it('a network failure schedules a retry and keeps the report queued, not submitted', async () => {
    const transport = new ScriptedTransport(['NETWORK']);
    const h = buildHarness(db, transport, clock);
    const id = await queueReport(h);
    await h.engine.runOnce('manual');

    const entry = await db.outbox.get(id);
    expect(entry?.state).toBe('retry_scheduled');
    expect(entry?.lastErrorCode).toBe('NETWORK');
    expect(entry?.nextAttemptAt).toBeDefined();
    expect((await db.reports.get(id))?.lifecycle).toBe('completed');
    expect(h.store.getSnapshot().lastAttemptOutcome).toBe('failed');
  });

  it('does not retry before the backoff has elapsed, and does retry after it', async () => {
    const transport = new ScriptedTransport(['SERVER_5XX', 'ok']);
    const h = buildHarness(db, transport, clock);
    const id = await queueReport(h);
    await h.engine.runOnce('manual');
    expect(transport.calls).toHaveLength(1);

    await h.engine.runOnce('timer');
    expect(transport.calls).toHaveLength(1); // still in backoff

    clock.now += 60_000;
    await h.engine.runOnce('timer');
    expect(transport.calls).toHaveLength(2);
    expect((await db.outbox.get(id))?.state).toBe('submitted');
  });

  it('a validation rejection moves the report to needs_attention and never retries it automatically', async () => {
    const transport = new ScriptedTransport(['VALIDATION_REJECTED']);
    const h = buildHarness(db, transport, clock);
    const id = await queueReport(h);
    await h.engine.runOnce('manual');

    const entry = await db.outbox.get(id);
    expect(entry?.state).toBe('needs_attention');
    expect(entry?.nextAttemptAt).toBeUndefined();

    clock.now += 24 * 3600_000;
    await h.engine.runOnce('timer');
    expect(transport.calls).toHaveLength(1);
    expect((await db.reports.get(id))?.lifecycle).toBe('completed');
  });

  it('an auth failure pauses the queue, keeps the report, and resumes after re-authentication', async () => {
    const transport = new ScriptedTransport(['AUTH_EXPIRED', 'ok']);
    const h = buildHarness(db, transport, clock);
    const id = await queueReport(h);
    await h.engine.runOnce('manual');

    expect(h.store.getSnapshot().paused).toBe(true);
    expect((await db.reports.get(id))?.lifecycle).toBe('completed');

    await h.engine.runOnce('timer');
    expect(transport.calls).toHaveLength(1); // paused: nothing sent

    h.store.update({ paused: false });
    clock.now += 60_000;
    await h.engine.runOnce('manual');
    expect((await db.reports.get(id))?.lifecycle).toBe('submitted');
  });

  it('sends queued reports oldest first', async () => {
    const transport = new ScriptedTransport([]);
    const h = buildHarness(db, transport, clock);
    const first = await queueReport(h, { ...VALID_SUPPORT_ANSWERS, supportNotes: 'SYNTHETIC: first' });
    clock.now += 1000;
    const second = await queueReport(h, { ...VALID_SUPPORT_ANSWERS, supportNotes: 'SYNTHETIC: second' });
    await h.engine.runOnce('manual');
    expect(transport.calls.map((c) => c.clientId)).toEqual([first, second]);
  });

  it('a report is sent at most once when it has been acknowledged (no duplicates on re-run)', async () => {
    const transport = new ScriptedTransport([]);
    const h = buildHarness(db, transport, clock);
    await queueReport(h);
    await h.engine.runOnce('manual');
    await h.engine.runOnce('manual');
    await h.engine.runOnce('timer');
    expect(transport.calls).toHaveLength(1);
  });

  it('recovers a send interrupted by closing the app: it is retried with the same idempotency key', async () => {
    const h = buildHarness(db, new ScriptedTransport([]), clock);
    const id = await queueReport(h);
    // Simulate: the app died while the request was in flight.
    await db.outbox.update(id, { state: 'sending', attempts: 1 });
    await h.outbox.recoverInterrupted();
    expect((await db.outbox.get(id))?.state).toBe('retry_scheduled');

    const transport = new ScriptedTransport([]);
    const h2 = buildHarness(db, transport, clock);
    clock.now += 60_000;
    await h2.engine.runOnce('app_start');
    expect(transport.calls).toHaveLength(1);
    expect(transport.calls[0]?.clientId).toBe(id);
  });
});

describe('simulated server idempotency', () => {
  it('a repeated submission with the same clientId returns the original receipt, not a new record', async () => {
    const transport = new SimulatedTransport({ latencyMs: 0, random: () => 0.9, sleep: () => Promise.resolve() });
    const env: SubmitEnvelope = {
      clientId: 'a1b2c3d4-0000-4000-8000-000000000001',
      kind: 'btp_visit',
      revision: 1,
      schemaVersion: 0,
      payloadHash: 'hash-1',
      payload: { visitDate: '2026-11-01' },
    };
    const first = await transport.submit(env);
    const second = await transport.submit(env);
    expect(second.receiptId).toBe(first.receiptId);
    expect(transport.storedCount()).toBe(1);
  });

  it('the same clientId with a different payload is a conflict, never an overwrite', async () => {
    const transport = new SimulatedTransport({ latencyMs: 0, random: () => 0.9, sleep: () => Promise.resolve() });
    const env: SubmitEnvelope = {
      clientId: 'a1b2c3d4-0000-4000-8000-000000000002',
      kind: 'btp_visit',
      revision: 1,
      schemaVersion: 0,
      payloadHash: 'hash-1',
      payload: {},
    };
    await transport.submit(env);
    await expect(transport.submit({ ...env, payloadHash: 'hash-2' })).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('offline mode fails with a network error and stores nothing', async () => {
    const transport = new SimulatedTransport({ latencyMs: 0, random: () => 0.9, sleep: () => Promise.resolve() });
    transport.setMode('offline');
    await expect(
      transport.submit({
        clientId: 'a1b2c3d4-0000-4000-8000-000000000003',
        kind: 'btp_visit',
        revision: 1,
        schemaVersion: 0,
        payloadHash: 'h',
        payload: {},
      }),
    ).rejects.toMatchObject({ code: 'NETWORK' });
    expect(transport.storedCount()).toBe(0);
  });

  it('flaky mode can lose the response after storing: the retry is deduplicated to one record', async () => {
    // Random draws in order: latency jitter (0), flaky roll (0.5 -> "response lost" branch: stored, then
    // timeout). Everything after that defaults to 0.9, which succeeds.
    const rolls = [0, 0.5];
    const transport = new SimulatedTransport({
      latencyMs: 0,
      random: () => rolls.shift() ?? 0.9,
      sleep: () => Promise.resolve(),
    });
    transport.setMode('flaky');
    const env: SubmitEnvelope = {
      clientId: 'a1b2c3d4-0000-4000-8000-000000000004',
      kind: 'btp_visit',
      revision: 1,
      schemaVersion: 0,
      payloadHash: 'h',
      payload: {},
    };
    await expect(transport.submit(env)).rejects.toMatchObject({ code: 'TIMEOUT' });
    expect(transport.storedCount()).toBe(1);

    const retry = await transport.submit(env);
    expect(retry.receiptId).toMatch(/^SIM-RCPT-/);
    expect(transport.storedCount()).toBe(1);
  });
});
