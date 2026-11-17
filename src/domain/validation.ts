import { z } from 'zod';
import type { Answers, FieldDefinition, FormDefinition } from './types';

export type FieldErrors = Partial<Record<string, string>>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const REQUIRED = 'Required';

/** Treat null, empty text and empty lists as "not answered" so required messages are consistent. */
function emptyToUndefined(value: unknown): unknown {
  if (value === null || value === '') return undefined;
  if (Array.isArray(value) && value.length === 0) return undefined;
  return value;
}

/**
 * Error text for a schema: "Required" when nothing was entered, otherwise the given message.
 * Zod 4 API: the `error` option receives the issue, including the input that failed.
 */
function messages(invalid: string) {
  return { error: (issue: { input: unknown }) => (issue.input === undefined ? REQUIRED : invalid) };
}

function fieldSchema(field: FieldDefinition): z.ZodType {
  const required = field.required === true;
  let inner: z.ZodType;
  switch (field.type) {
    case 'text':
    case 'textarea': {
      let s = z.string(messages('Invalid text')).trim();
      if (field.maxLength !== undefined) s = s.max(field.maxLength, 'Too long');
      inner = required ? s.min(1, REQUIRED) : s;
      break;
    }
    case 'date':
      inner = z.string(messages('Enter a valid date')).regex(ISO_DATE, 'Enter a valid date');
      break;
    case 'number': {
      let n = z.number(messages('Enter a number'));
      if (field.min !== undefined) n = n.min(field.min, `Must be at least ${field.min}`);
      if (field.max !== undefined) n = n.max(field.max, `Must be ${field.max} or less`);
      inner = n;
      break;
    }
    case 'select': {
      const values = (field.options ?? []).map((o) => o.value);
      inner = z.enum(values as [string, ...string[]], { error: () => 'Choose an option' });
      break;
    }
    case 'multiselect': {
      const values = new Set((field.options ?? []).map((o) => o.value));
      inner = z
        .array(z.string().refine((v) => values.has(v), 'Invalid option'), messages('Invalid selection'))
        .min(required ? 1 : 0, REQUIRED);
      break;
    }
    case 'checkbox':
      return z.boolean().optional().nullable();
  }
  if (required) return z.preprocess(emptyToUndefined, inner);
  return z.preprocess(emptyToUndefined, inner.optional().nullable());
}

/** Build a Zod object schema for a form definition. Used on completion, not on every keystroke. */
export function buildAnswersSchema(def: FormDefinition): z.ZodObject<Record<string, z.ZodType>> {
  const shape: Record<string, z.ZodType> = {};
  for (const field of def.fields) shape[field.id] = fieldSchema(field);
  return z.object(shape);
}

/**
 * Validate answers for completion. Returns a map of field id to message, or null when valid.
 * Error messages are generic and never echo the submitted value.
 */
export function validateForCompletion(def: FormDefinition, answers: Answers): FieldErrors | null {
  const result = buildAnswersSchema(def).safeParse(answers);
  if (result.success) return null;
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}
