import type { ISOInstant, UUID } from '../domain/types';

/** Client-generated UUID v4. Used as the report id and as the idempotency key for submission. */
export function newId(): UUID {
  return crypto.randomUUID();
}

export function nowIso(): ISOInstant {
  return new Date().toISOString();
}

/** Local calendar date (Europe/London in practice) as YYYY-MM-DD, for form defaults. */
export function todayLocalDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
