import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { DISPLAY_LABELS, deriveNetworkIndicator, type DisplayState, type NetworkIndicator } from '../domain/status';
import type { SyncSnapshot } from '../sync/syncStore';

/** Always-visible banner. Shown on every screen so nobody mistakes this for a live system. */
export function PrototypeBanner() {
  return (
    <div className="prototype-banner" role="note">
      <strong>PROTOTYPE</strong> · <strong>SYNTHETIC DATA ONLY</strong>
      <span className="visually-hidden">. Do not enter real personal, welfare or incident information.</span>
    </div>
  );
}

const INDICATOR_META: Record<NetworkIndicator, { icon: string; tone: string; text: string }> = {
  ONLINE: { icon: '●', tone: 'ok', text: 'Connected. Reports send automatically.' },
  OFFLINE: { icon: '○', tone: 'offline', text: 'No connection. Reports are saved on this device.' },
  SYNCING: { icon: '↻', tone: 'syncing', text: 'Sending reports now…' },
  'SYNC FAILED': { icon: '!', tone: 'failed', text: 'Some reports were not sent. They will retry.' },
};

export function networkIndicatorFor(snapshot: SyncSnapshot): NetworkIndicator {
  return deriveNetworkIndicator({
    deviceOnline: snapshot.deviceOnline,
    sendInFlight: snapshot.sendInFlight,
    pendingCount: snapshot.pendingCount,
    lastAttemptOutcome: snapshot.lastAttemptOutcome,
  });
}

/** The ONLINE / OFFLINE / SYNCING / SYNC FAILED indicator. Text and icon, never colour alone. */
export function NetworkStatus({ snapshot }: { snapshot: SyncSnapshot }) {
  const indicator = networkIndicatorFor(snapshot);
  const meta = INDICATOR_META[indicator];
  return (
    <div className={`network-status tone-${meta.tone}`} role="status" aria-live="polite">
      <span className="network-status__icon" aria-hidden="true">
        {meta.icon}
      </span>
      <span className="network-status__label">{indicator}</span>
      <span className="network-status__detail">{meta.text}</span>
      {snapshot.pendingCount > 0 ? (
        <span className="network-status__count">
          {snapshot.pendingCount} waiting or needing attention
        </span>
      ) : null}
    </div>
  );
}

const STATE_TONE: Record<DisplayState, string> = {
  saved_locally: 'neutral',
  waiting_to_sync: 'syncing',
  sending: 'syncing',
  retry_scheduled: 'failed',
  needs_attention: 'failed',
  submitted: 'ok',
};

const STATE_ICON: Record<DisplayState, string> = {
  saved_locally: '▢',
  waiting_to_sync: '◷',
  sending: '↻',
  retry_scheduled: '!',
  needs_attention: '!',
  submitted: '✓',
};

export function ReportStatusChip({ state }: { state: DisplayState }) {
  return (
    <span className={`status-chip tone-${STATE_TONE[state]}`}>
      <span aria-hidden="true">{STATE_ICON[state]}</span> {DISPLAY_LABELS[state]}
    </span>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`.trim()}>{children}</section>;
}

export function PageTitle({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-title">
      <h1>{children}</h1>
      {actions ? <div className="page-title__actions">{actions}</div> : null}
    </div>
  );
}

export function TileLink({ to, title, description, icon }: { to: string; title: string; description: string; icon: string }) {
  return (
    <Link to={to} className="tile">
      <span className="tile__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="tile__title">{title}</span>
      <span className="tile__description">{description}</span>
    </Link>
  );
}

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: '⌂' },
  { to: '/unsent', label: 'Unsent', icon: '◷' },
  { to: '/submitted', label: 'Submitted', icon: '✓' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
] as const;

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) => `bottom-nav__link${isActive ? ' is-active' : ''}`}
        >
          <span className="bottom-nav__icon" aria-hidden="true">
            {item.icon}
          </span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function formatTime(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
