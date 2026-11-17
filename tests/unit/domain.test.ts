import { describe, expect, it } from 'vitest';
import { deriveNetworkIndicator, displayStateFor, canReturnToDraft } from '../../src/domain/status';
import { validateForCompletion } from '../../src/domain/validation';
import { FORM_DEFINITIONS } from '../../src/domain/formDefinitions';
import { sanitiseAnswers, sanitiseText } from '../../src/lib/sanitise';
import { nextDelayMs, DEFAULT_BACKOFF } from '../../src/sync/backoff';
import { canonicalJson, payloadHash } from '../../src/lib/hash';
import type { OutboxRecord } from '../../src/domain/types';

describe('deriveNetworkIndicator', () => {
  const base = { deviceOnline: true, sendInFlight: false, pendingCount: 0, lastAttemptOutcome: 'none' as const };

  it('shows OFFLINE whenever the device has no connection, even with work pending', () => {
    expect(deriveNetworkIndicator({ ...base, deviceOnline: false, pendingCount: 3 })).toBe('OFFLINE');
  });

  it('shows SYNCING while a send is in flight', () => {
    expect(deriveNetworkIndicator({ ...base, sendInFlight: true, pendingCount: 1 })).toBe('SYNCING');
  });

  it('shows SYNC FAILED when the last attempt failed and work is still waiting', () => {
    expect(deriveNetworkIndicator({ ...base, lastAttemptOutcome: 'failed', pendingCount: 1 })).toBe('SYNC FAILED');
  });

  it('does not show SYNC FAILED once the queue is empty', () => {
    expect(deriveNetworkIndicator({ ...base, lastAttemptOutcome: 'failed', pendingCount: 0 })).toBe('ONLINE');
  });

  it('shows ONLINE when connected with nothing failing', () => {
    expect(deriveNetworkIndicator(base)).toBe('ONLINE');
  });
});

describe('displayStateFor: the three distinct user-facing states', () => {
  const entry = (state: OutboxRecord['state']): OutboxRecord => ({
    clientId: 'c',
    reportId: 'c',
    kind: 'btp_visit',
    revision: 1,
    payloadHash: 'h',
    state,
    attempts: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  });

  it('a draft is saved locally, never submitted', () => {
    expect(displayStateFor('draft', undefined)).toBe('saved_locally');
  });

  it('a queued report is waiting to sync, not submitted', () => {
    expect(displayStateFor('completed', entry('waiting_to_sync'))).toBe('waiting_to_sync');
  });

  it('a completed report with no acknowledgement can never display as submitted', () => {
    expect(displayStateFor('completed', entry('retry_scheduled'))).not.toBe('submitted');
    expect(displayStateFor('completed', entry('needs_attention'))).not.toBe('submitted');
    expect(displayStateFor('completed', entry('sending'))).not.toBe('submitted');
  });

  it('only a submitted lifecycle displays as submitted', () => {
    expect(displayStateFor('submitted', entry('submitted'))).toBe('submitted');
  });

  it('only work that has not been sent successfully can be withdrawn', () => {
    expect(canReturnToDraft('waiting_to_sync')).toBe(true);
    expect(canReturnToDraft('retry_scheduled')).toBe(true);
    expect(canReturnToDraft('needs_attention')).toBe(true);
    expect(canReturnToDraft('sending')).toBe(false);
    expect(canReturnToDraft('submitted')).toBe(false);
    expect(canReturnToDraft(undefined)).toBe(false);
  });
});

describe('validation', () => {
  const def = FORM_DEFINITIONS.btp_visit;

  it('reports required fields without echoing values', () => {
    const errors = validateForCompletion(def, { visitDate: null, stationText: '' });
    expect(errors).not.toBeNull();
    expect(errors?.visitDate).toBe('Required');
    expect(validateForCompletion(def, { visitDate: 'not-a-date', stationText: 'x', visitType: 'type_a' })?.visitDate).toBe(
      'Enter a valid date',
    );
    expect(errors?.stationText).toBe('Required');
    expect(JSON.stringify(errors)).not.toContain('SYNTHETIC');
  });

  it('accepts a complete, valid answer set', () => {
    const errors = validateForCompletion(def, {
      visitDate: '2026-11-13',
      stationText: 'SYNTHETIC: Example Junction',
      visitType: 'type_a',
      visitNotes: null,
    });
    expect(errors).toBeNull();
  });

  it('bounds numeric fields', () => {
    const nr = FORM_DEFINITIONS.network_rail_visit;
    const base = { visitDate: '2026-11-13', locationText: 'SYNTHETIC: X', followUpRequired: false };
    expect(validateForCompletion(nr, { ...base, numberOfEngagements: 1000 })?.numberOfEngagements).toBe(
      'Must be 999 or less',
    );
    expect(validateForCompletion(nr, { ...base, numberOfEngagements: -1 })?.numberOfEngagements).toBe(
      'Must be at least 0',
    );
  });
});

describe('sanitisation', () => {
  it('strips control characters, normalises line endings and trims', () => {
    expect(sanitiseText('  hello\u0007 world\r\n\r\n\r\n\r\nend  ')).toBe('hello world\n\nend');
  });

  it('caps length', () => {
    expect(sanitiseText('abcdef', 3)).toBe('abc');
  });

  it('drops keys that are not in the form and rejects invalid option values', () => {
    const def = FORM_DEFINITIONS.btp_visit;
    const out = sanitiseAnswers(def, {
      visitDate: '2026-11-13',
      stationText: '  Example  ',
      visitType: 'not-an-option',
      injected: '<script>',
    });
    expect(out).not.toHaveProperty('injected');
    expect(out.stationText).toBe('Example');
    expect(out.visitType).toBeNull();
  });
});

describe('backoff', () => {
  it('grows with attempts but never exceeds the cap', () => {
    const max = (attempt: number) => nextDelayMs(attempt, DEFAULT_BACKOFF, () => 1);
    expect(max(1)).toBe(5_000);
    expect(max(2)).toBe(10_000);
    expect(max(3)).toBe(20_000);
    expect(max(50)).toBe(DEFAULT_BACKOFF.capMs);
  });

  it('never returns less than the floor, so retries cannot loop tightly', () => {
    expect(nextDelayMs(1, DEFAULT_BACKOFF, () => 0)).toBeGreaterThanOrEqual(DEFAULT_BACKOFF.baseMs);
  });
});

describe('hashing', () => {
  it('canonical JSON ignores key order', () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe(canonicalJson({ a: { c: 3, d: 2 }, b: 1 }));
  });

  it('produces the same hash for the same content and a different hash for changed content', async () => {
    const a = await payloadHash({ x: 1, y: 'two' });
    const b = await payloadHash({ y: 'two', x: 1 });
    const c = await payloadHash({ x: 2, y: 'two' });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});
