/**
 * Core domain types for the Phase 1 prototype.
 *
 * Design rules (see docs/ARCHITECTURE.md):
 * - A report's *lifecycle* lives on the report. Its *sync* state lives only on the outbox record.
 * - "submitted" is only ever set from a server receipt. Nothing else may set it.
 * - Answers are stored as a generic map keyed by field id, so form definitions can change
 *   without a schema migration of the report table.
 */

export type UUID = string;
/** ISO-8601 instant in UTC, e.g. 2026-11-17T14:02:11.000Z */
export type ISOInstant = string;

/** Every report type the prototype knows about. Add new workflows here and in formRegistry. */
export type ReportKind = 'support_interaction' | 'btp_visit' | 'network_rail_visit';

export type ReportLifecycle = 'draft' | 'completed' | 'submitted';

export type AnswerValue = string | number | boolean | string[] | null;
export type Answers = Record<string, AnswerValue>;

export interface ReportRecord {
  id: UUID;
  kind: ReportKind;
  /** Version of the form definition the answers were captured against. */
  schemaVersion: number;
  /** Incremented on every local edit. */
  revision: number;
  lifecycle: ReportLifecycle;
  answers: Answers;
  /** Literal true in this prototype. Every record is synthetic. */
  isSynthetic: true;
  reporterId: string;
  createdAt: ISOInstant;
  updatedAt: ISOInstant;
  completedAt?: ISOInstant;
  submittedAt?: ISOInstant;
  /** Issued by the server on acknowledgement. Only present when lifecycle === 'submitted'. */
  receiptId?: string;
}

export type OutboxState =
  | 'waiting_to_sync'
  | 'sending'
  | 'retry_scheduled'
  | 'needs_attention'
  | 'submitted';

export type SyncErrorCode =
  | 'NETWORK'
  | 'TIMEOUT'
  | 'SERVER_5XX'
  | 'RATE_LIMITED'
  | 'AUTH_EXPIRED'
  | 'VALIDATION_REJECTED'
  | 'CONFLICT'
  | 'UNKNOWN';

export interface OutboxRecord {
  /** Equal to the report id. Primary key: a report can be queued at most once. */
  clientId: UUID;
  reportId: UUID;
  kind: ReportKind;
  revision: number;
  payloadHash: string;
  state: OutboxState;
  attempts: number;
  nextAttemptAt?: ISOInstant;
  lastAttemptAt?: ISOInstant;
  lastErrorCode?: SyncErrorCode;
  receiptId?: string;
  acknowledgedAt?: ISOInstant;
  createdAt: ISOInstant;
}

export type AuditAction =
  | 'draft_created'
  | 'draft_discarded'
  | 'report_completed'
  | 'returned_to_draft'
  | 'queued'
  | 'send_attempted'
  | 'acknowledged'
  | 'send_failed'
  | 'marked_needs_attention';

export interface AuditEvent {
  id: UUID;
  at: ISOInstant;
  reportId?: UUID;
  action: AuditAction;
  /** Enumerated codes only. Never report content. */
  code?: SyncErrorCode | 'ok';
}

/** Form definition types. Field definitions are data, so forms can be edited without touching UI code. */
export type FieldType = 'text' | 'textarea' | 'date' | 'number' | 'select' | 'multiselect' | 'checkbox';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDefinition {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  helpText?: string;
  options?: FieldOption[];
  min?: number;
  max?: number;
  maxLength?: number;
}

export interface FormDefinition {
  kind: ReportKind;
  schemaVersion: number;
  title: string;
  /** Short name used on tiles and list rows. */
  shortTitle: string;
  description: string;
  /**
   * Where the field list came from. Phase 1 forms use placeholder fields until Railway Mission
   * supplies the real ones (clarification C4). The UI shows a banner whenever this is not 'approved'.
   */
  fieldSource: 'placeholder' | 'approved';
  fields: FieldDefinition[];
}
