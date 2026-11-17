import type { AnswerValue, Answers, FieldDefinition, FormDefinition } from '../domain/types';

/**
 * Normalise free text: Unicode NFC, strip control characters (keeping line breaks and tabs),
 * collapse runs of blank lines, trim, and cap length. Applied on every text input before
 * it reaches the database.
 */
export function sanitiseText(input: string, maxLength = 1000): string {
  const normalised = input
    .normalize('NFC')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return normalised.length > maxLength ? normalised.slice(0, maxLength) : normalised;
}

/** Sanitise a whole answers object according to the form definition. Unknown keys are dropped. */
export function sanitiseAnswers(def: FormDefinition, raw: Answers): Answers {
  const out: Answers = {};
  for (const field of def.fields) {
    const value = raw[field.id];
    out[field.id] = sanitiseValue(field, value);
  }
  return out;
}

function sanitiseValue(field: FieldDefinition, value: AnswerValue | undefined): AnswerValue {
  if (value === undefined || value === null) {
    return field.type === 'checkbox' ? false : null;
  }
  switch (field.type) {
    case 'checkbox':
      return value === true;
    case 'number': {
      const n = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(n) ? n : null;
    }
    case 'multiselect': {
      if (!Array.isArray(value)) return [];
      const allowed = new Set(field.options?.map((o) => o.value) ?? []);
      return value.filter((v) => allowed.has(v));
    }
    case 'select': {
      if (typeof value !== 'string') return null;
      const allowed = new Set(field.options?.map((o) => o.value) ?? []);
      return allowed.has(value) ? value : null;
    }
    case 'date':
    case 'text':
    case 'textarea': {
      if (typeof value !== 'string') return null;
      const cleaned = sanitiseText(value, field.maxLength ?? 1000);
      return cleaned === '' ? null : cleaned;
    }
  }
}
