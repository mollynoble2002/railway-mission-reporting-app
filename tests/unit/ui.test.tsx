import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NetworkStatus, ReportStatusChip } from '../../src/ui/components';
import type { SyncSnapshot } from '../../src/sync/syncStore';

const base: SyncSnapshot = {
  deviceOnline: true,
  simulationMode: 'online',
  sendInFlight: false,
  pendingCount: 0,
  lastAttemptOutcome: 'none',
  paused: false,
};

describe('NetworkStatus indicator', () => {
  it('shows ONLINE with text, not colour alone', () => {
    render(<NetworkStatus snapshot={base} />);
    expect(screen.getByRole('status')).toHaveTextContent('ONLINE');
  });

  it('shows OFFLINE when the device has no connection', () => {
    render(<NetworkStatus snapshot={{ ...base, deviceOnline: false, pendingCount: 2 }} />);
    expect(screen.getByRole('status')).toHaveTextContent('OFFLINE');
    expect(screen.getByRole('status')).toHaveTextContent('2 waiting or needing attention');
  });

  it('shows SYNCING during a send', () => {
    render(<NetworkStatus snapshot={{ ...base, sendInFlight: true, pendingCount: 1 }} />);
    expect(screen.getByRole('status')).toHaveTextContent('SYNCING');
  });

  it('shows SYNC FAILED after a failed attempt while work is pending', () => {
    render(<NetworkStatus snapshot={{ ...base, lastAttemptOutcome: 'failed', pendingCount: 1 }} />);
    expect(screen.getByRole('status')).toHaveTextContent('SYNC FAILED');
  });
});

describe('ReportStatusChip', () => {
  it('never labels a locally saved or queued report as submitted', () => {
    const { rerender } = render(<ReportStatusChip state="saved_locally" />);
    expect(screen.queryByText(/Submitted/)).toBeNull();
    rerender(<ReportStatusChip state="waiting_to_sync" />);
    expect(screen.getByText('Waiting to send')).toBeInTheDocument();
    expect(screen.queryByText(/Submitted/)).toBeNull();
  });
});
