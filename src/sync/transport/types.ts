import type { Answers, ReportKind, SyncErrorCode, UUID } from '../../domain/types';

/**
 * Everything the server needs to accept a report. The `clientId` doubles as the
 * idempotency key: sending the same envelope twice must never create two records.
 */
export interface SubmitEnvelope {
  clientId: UUID;
  kind: ReportKind;
  revision: number;
  schemaVersion: number;
  payloadHash: string;
  payload: Answers;
}

export interface SubmitReceipt {
  receiptId: string;
  receivedAt: string;
}

/** A failure the engine can act on. Carries an enumerated code only, never server text. */
export class TransportError extends Error {
  constructor(readonly code: SyncErrorCode) {
    super(`Transport failure: ${code}`);
    this.name = 'TransportError';
  }
}

/**
 * The seam between the app and "the server". Phase 1 uses SimulatedTransport.
 * Production will provide an HTTPS implementation with the same contract.
 */
export interface SyncTransport {
  submit(envelope: SubmitEnvelope): Promise<SubmitReceipt>;
  /** Lightweight reachability check. Must not send any report data. */
  ping(): Promise<boolean>;
}
