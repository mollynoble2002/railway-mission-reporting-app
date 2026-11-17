import type { Answers, OutboxRecord, ReportKind, ReportRecord } from '../../domain/types';
import type { RMDatabase } from '../db';

/**
 * SYNTHETIC TEST DATA ONLY.
 *
 * Every location, answer and receipt below is invented for demonstration. Nothing here
 * describes a real person, real place of an incident, or real event. Locations are fictional
 * names, not real stations. Seed records use fixed, obviously fake identifiers.
 */

export const SYNTHETIC_REPORTER_ID = '00000000-0000-4000-8000-000000000001';
export const SEED_FLAG_KEY = 'synthetic_seed_v1';

const T0 = '2026-11-01T09:00:00.000Z';
const T1 = '2026-11-02T10:30:00.000Z';
const T2 = '2026-11-03T16:45:00.000Z';

function draft(
  id: string,
  kind: ReportKind,
  answers: Answers,
  at: string,
): ReportRecord {
  return {
    id,
    kind,
    schemaVersion: 0,
    revision: 1,
    lifecycle: 'draft',
    answers,
    isSynthetic: true,
    reporterId: SYNTHETIC_REPORTER_ID,
    createdAt: at,
    updatedAt: at,
  };
}

const SEED_REPORTS: ReportRecord[] = [
  // Drafts: editable, saved on this device only.
  draft(
    '00000000-0000-4000-8000-0000000000d1',
    'support_interaction',
    {
      interactionDate: '2026-11-14',
      locationText: 'SYNTHETIC: Test Platform 3 (fictional)',
      interactionType: 'type_a',
      supportNotes: 'SYNTHETIC: Draft example. Not real.',
    },
    T2,
  ),
  draft(
    '00000000-0000-4000-8000-0000000000d2',
    'btp_visit',
    { visitDate: '2026-11-13', stationText: 'SYNTHETIC: Example Junction (fictional)' },
    T1,
  ),

  // Submitted: acknowledged by the (simulated) server. Read-only.
  {
    id: '00000000-0000-4000-8000-0000000000s1',
    kind: 'network_rail_visit',
    schemaVersion: 0,
    revision: 3,
    lifecycle: 'submitted',
    answers: {
      visitDate: '2026-10-28',
      locationText: 'SYNTHETIC: Fictional Depot A',
      numberOfEngagements: 4,
      generalThemes: ['theme_a'],
      followUpRequired: true,
      visitNotes: 'SYNTHETIC: Example submitted record.',
    },
    isSynthetic: true,
    reporterId: SYNTHETIC_REPORTER_ID,
    createdAt: T0,
    updatedAt: T0,
    completedAt: T0,
    submittedAt: T0,
    receiptId: 'SIM-RCPT-SEED-0001',
  },
  {
    id: '00000000-0000-4000-8000-0000000000s2',
    kind: 'support_interaction',
    schemaVersion: 0,
    revision: 2,
    lifecycle: 'submitted',
    answers: {
      interactionDate: '2026-10-30',
      locationText: 'SYNTHETIC: Fictional Station B',
      interactionType: 'type_b',
      supportNotes: 'SYNTHETIC: Example submitted record.',
    },
    isSynthetic: true,
    reporterId: SYNTHETIC_REPORTER_ID,
    createdAt: T1,
    updatedAt: T1,
    completedAt: T1,
    submittedAt: T1,
    receiptId: 'SIM-RCPT-SEED-0002',
  },

  // Completed but rejected by the server: needs a person to act.
  {
    id: '00000000-0000-4000-8000-0000000000n1',
    kind: 'btp_visit',
    schemaVersion: 0,
    revision: 2,
    lifecycle: 'completed',
    answers: {
      visitDate: '2026-11-05',
      stationText: 'SYNTHETIC: Example Central (fictional)',
      visitType: 'type_b',
      visitNotes: 'SYNTHETIC: Example of a record the server rejected.',
    },
    isSynthetic: true,
    reporterId: SYNTHETIC_REPORTER_ID,
    createdAt: T2,
    updatedAt: T2,
    completedAt: T2,
  },
];

const SEED_OUTBOX: OutboxRecord[] = [
  {
    clientId: '00000000-0000-4000-8000-0000000000s1',
    reportId: '00000000-0000-4000-8000-0000000000s1',
    kind: 'network_rail_visit',
    revision: 3,
    payloadHash: 'synthetic-seed-hash-s1',
    state: 'submitted',
    attempts: 1,
    lastAttemptAt: T0,
    receiptId: 'SIM-RCPT-SEED-0001',
    acknowledgedAt: T0,
    createdAt: T0,
  },
  {
    clientId: '00000000-0000-4000-8000-0000000000s2',
    reportId: '00000000-0000-4000-8000-0000000000s2',
    kind: 'support_interaction',
    revision: 2,
    payloadHash: 'synthetic-seed-hash-s2',
    state: 'submitted',
    attempts: 1,
    lastAttemptAt: T1,
    receiptId: 'SIM-RCPT-SEED-0002',
    acknowledgedAt: T1,
    createdAt: T1,
  },
  {
    clientId: '00000000-0000-4000-8000-0000000000n1',
    reportId: '00000000-0000-4000-8000-0000000000n1',
    kind: 'btp_visit',
    revision: 2,
    payloadHash: 'synthetic-seed-hash-n1',
    state: 'needs_attention',
    attempts: 1,
    lastAttemptAt: T2,
    lastErrorCode: 'VALIDATION_REJECTED',
    createdAt: T2,
  },
];

/**
 * Load the synthetic seed once. Idempotent: a flag in `meta` prevents reloading. The flag is
 * written in the same transaction as the data, so a partial seed cannot happen.
 */
export async function seedSyntheticDataIfEmpty(db: RMDatabase): Promise<boolean> {
  return db.transaction('rw', db.reports, db.outbox, db.meta, async () => {
    const flag = await db.meta.get(SEED_FLAG_KEY);
    if (flag) return false;
    await db.reports.bulkPut(SEED_REPORTS);
    await db.outbox.bulkPut(SEED_OUTBOX);
    await db.meta.put({ key: SEED_FLAG_KEY, value: new Date().toISOString() });
    return true;
  });
}

/** Erase all local data and reload the seed. Used by the demo reset in Settings. */
export async function resetToSyntheticData(db: RMDatabase): Promise<void> {
  await db.transaction('rw', db.reports, db.outbox, db.auditEvents, db.meta, async () => {
    await db.reports.clear();
    await db.outbox.clear();
    await db.auditEvents.clear();
    await db.meta.clear();
  });
  await seedSyntheticDataIfEmpty(db);
}
