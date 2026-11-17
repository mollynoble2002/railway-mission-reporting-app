import { payloadHash } from '../lib/hash';
import type { Answers, ReportKind } from './types';

/**
 * The hash that identifies a completed report's content. Computed at completion and stored on the
 * outbox entry, so a later change to the payload is detectable.
 */
export function reportPayloadHash(report: { kind: ReportKind; schemaVersion: number; answers: Answers }): Promise<string> {
  return payloadHash({ kind: report.kind, schemaVersion: report.schemaVersion, answers: report.answers });
}
