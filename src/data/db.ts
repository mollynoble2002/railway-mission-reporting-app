import Dexie, { type Table } from 'dexie';
import type { AuditEvent, OutboxRecord, ReportRecord } from '../domain/types';

/** Small key/value table for app-level flags, such as whether seed data has been loaded. */
export interface MetaRecord {
  key: string;
  value: string;
}

/**
 * Local IndexedDB database (Dexie).
 *
 * Version 1 schema. Add new versions with `this.version(n).stores({...})` and an upgrade
 * callback rather than editing an existing version.
 *
 * Note: IndexedDB on the device is NOT a security boundary. Phase 1 holds synthetic data only.
 */
export class RMDatabase extends Dexie {
  reports!: Table<ReportRecord, string>;
  outbox!: Table<OutboxRecord, string>;
  auditEvents!: Table<AuditEvent, string>;
  meta!: Table<MetaRecord, string>;

  constructor(name = 'rm-prototype') {
    super(name);
    this.version(1).stores({
      reports: 'id, kind, lifecycle, updatedAt, createdAt',
      outbox: 'clientId, reportId, state, nextAttemptAt, createdAt',
      auditEvents: 'id, at, reportId',
      meta: 'key',
    });
  }
}

export const db = new RMDatabase();
