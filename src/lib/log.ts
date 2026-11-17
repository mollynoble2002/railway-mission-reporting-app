/**
 * The ONLY logging entry point in the application.
 *
 * It accepts an event name and an optional object of enumerated codes or counts. Anything that
 * is not a primitive code is dropped, so report content cannot reach the console by accident.
 * ESLint forbids direct `console.*` calls in src/ (see eslint.config.js).
 *
 * Phase 1 writes nothing to the console at all: `enabled` is off. Turn it on locally only
 * while debugging, and never with report content.
 */

type LogValue = string | number | boolean | null;

const enabled: boolean = false;

export function logEvent(event: string, fields: Record<string, LogValue> = {}): void {
  if (!enabled) return;
  const safe: Record<string, LogValue> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === 'string' && value.length > 40) continue; // long strings are likely content
    safe[key] = value;
  }
  // eslint-disable-next-line no-console
  console.info('[rm-prototype]', event, safe);
}
