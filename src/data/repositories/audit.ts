import type { AuditAction, AuditEvent, SyncErrorCode, UUID } from '../../domain/types';
import { newId, nowIso } from '../../lib/ids';
import type { RMDatabase } from '../db';

/**
 * Append a device-side audit event. Must be called INSIDE the same Dexie transaction as the
 * change it records, so the trail can never disagree with the data.
 * Codes only: never pass report content here.
 */
export function appendAudit(
  db: RMDatabase,
  action: AuditAction,
  options: { reportId?: UUID; code?: SyncErrorCode | 'ok' } = {},
): Promise<string> {
  const event: AuditEvent = {
    id: newId(),
    at: nowIso(),
    action,
    ...(options.reportId !== undefined ? { reportId: options.reportId } : {}),
    ...(options.code !== undefined ? { code: options.code } : {}),
  };
  return db.auditEvents.add(event);
}

export function listAuditEvents(db: RMDatabase, limit = 200): Promise<AuditEvent[]> {
  return db.auditEvents.orderBy('at').reverse().limit(limit).toArray();
}
