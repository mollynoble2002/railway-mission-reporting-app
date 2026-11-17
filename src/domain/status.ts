import type { OutboxRecord, OutboxState, ReportLifecycle } from './types';

/** The four network/sync indicators shown in the app header. */
export type NetworkIndicator = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'SYNC FAILED';

export interface IndicatorInputs {
  /** navigator.onLine, combined with any simulated "no connection" setting. */
  deviceOnline: boolean;
  /** True while a send request is in flight. */
  sendInFlight: boolean;
  /** Number of outbox entries not yet acknowledged. */
  pendingCount: number;
  /** Outcome of the most recent send attempt, or 'none' if none yet this session. */
  lastAttemptOutcome: 'ok' | 'failed' | 'none';
}

/**
 * Derive the single indicator to show. Order matters:
 * no connection beats everything; an active send is SYNCING; a failed last attempt with
 * work still waiting is SYNC FAILED; otherwise ONLINE.
 */
export function deriveNetworkIndicator(input: IndicatorInputs): NetworkIndicator {
  if (!input.deviceOnline) return 'OFFLINE';
  if (input.sendInFlight) return 'SYNCING';
  if (input.lastAttemptOutcome === 'failed' && input.pendingCount > 0) return 'SYNC FAILED';
  return 'ONLINE';
}

/**
 * The user-facing wording for a report's state. This is the only place the three distinct
 * states (saved locally / waiting to sync / submitted) are mapped to words.
 */
export type DisplayState =
  | 'saved_locally'
  | 'waiting_to_sync'
  | 'sending'
  | 'retry_scheduled'
  | 'needs_attention'
  | 'submitted';

export function displayStateFor(lifecycle: ReportLifecycle, outbox: OutboxRecord | undefined): DisplayState {
  if (lifecycle === 'submitted') return 'submitted';
  if (!outbox || lifecycle === 'draft') return 'saved_locally';
  return outboxToDisplay(outbox.state);
}

function outboxToDisplay(state: OutboxState): DisplayState {
  switch (state) {
    case 'waiting_to_sync':
      return 'waiting_to_sync';
    case 'sending':
      return 'sending';
    case 'retry_scheduled':
      return 'retry_scheduled';
    case 'needs_attention':
      return 'needs_attention';
    case 'submitted':
      return 'submitted';
  }
}

export const DISPLAY_LABELS: Record<DisplayState, string> = {
  saved_locally: 'Saved on this device',
  waiting_to_sync: 'Waiting to send',
  sending: 'Sending…',
  retry_scheduled: 'Not sent yet. Will retry',
  needs_attention: 'Needs attention',
  submitted: 'Submitted',
};

/** Whether an outbox entry may be withdrawn back to a draft (it has not been sent successfully). */
export function canReturnToDraft(state: OutboxState | undefined): boolean {
  return state === 'waiting_to_sync' || state === 'retry_scheduled' || state === 'needs_attention';
}
