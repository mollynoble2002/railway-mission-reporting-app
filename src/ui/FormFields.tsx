import type { AnswerValue, FieldDefinition } from '../domain/types';

interface FieldProps {
  field: FieldDefinition;
  value: AnswerValue | undefined;
  error?: string | undefined;
  disabled: boolean;
  onChange: (value: AnswerValue) => void;
}

/**
 * Renders one field from its definition. Large touch targets, a visible label, help text and an
 * error message linked with aria-describedby. Nothing here knows which form it belongs to.
 */
export function FormField({ field, value, error, disabled, onChange }: FieldProps) {
  const id = `f-${field.id}`;
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const describedBy = [field.helpText ? helpId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  const labelNode = (
    <span className="field__label">
      {field.label}
      {field.required ? <span className="field__required"> (required)</span> : null}
    </span>
  );

  const helpNode = field.helpText ? (
    <span id={helpId} className="field__help">
      {field.helpText}
    </span>
  ) : null;

  const errorNode = error ? (
    <span id={errorId} className="field__error">
      {error}
    </span>
  ) : null;

  switch (field.type) {
    case 'checkbox':
      return (
        <div className={`field field--checkbox${error ? ' has-error' : ''}`}>
          <label className="checkbox-row" htmlFor={id}>
            <input
              id={id}
              type="checkbox"
              checked={value === true}
              disabled={disabled}
              aria-describedby={describedBy}
              onChange={(e) => onChange(e.target.checked)}
            />
            <span>{field.label}</span>
          </label>
          {helpNode}
          {errorNode}
        </div>
      );

    case 'multiselect': {
      const selected = Array.isArray(value) ? value : [];
      return (
        <fieldset className={`field field--multi${error ? ' has-error' : ''}`} aria-describedby={describedBy}>
          <legend className="field__legend">{labelNode}</legend>
          {helpNode}
          <div className="chip-group">
            {(field.options ?? []).map((opt) => {
              const checked = selected.includes(opt.value);
              return (
                <label key={opt.value} className={`chip-option${checked ? ' is-checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...selected, opt.value]
                        : selected.filter((v) => v !== opt.value);
                      onChange(next);
                    }}
                  />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </div>
          {errorNode}
        </fieldset>
      );
    }

    case 'select':
      return (
        <div className={`field${error ? ' has-error' : ''}`}>
          <label htmlFor={id}>{labelNode}</label>
          {helpNode}
          <select
            id={id}
            className="input"
            value={typeof value === 'string' ? value : ''}
            disabled={disabled}
            aria-describedby={describedBy}
            onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
          >
            <option value="">Choose…</option>
            {(field.options ?? []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errorNode}
        </div>
      );

    case 'textarea': {
      const text = typeof value === 'string' ? value : '';
      const remaining = field.maxLength !== undefined ? field.maxLength - text.length : undefined;
      return (
        <div className={`field${error ? ' has-error' : ''}`}>
          <label htmlFor={id}>{labelNode}</label>
          {helpNode}
          <textarea
            id={id}
            className="input input--multiline"
            rows={5}
            value={text}
            maxLength={field.maxLength}
            disabled={disabled}
            aria-describedby={describedBy}
            onChange={(e) => onChange(e.target.value)}
          />
          {remaining !== undefined && remaining <= 100 ? (
            <span className="field__counter">{remaining} characters left</span>
          ) : null}
          {errorNode}
        </div>
      );
    }

    case 'number':
      return (
        <div className={`field${error ? ' has-error' : ''}`}>
          <label htmlFor={id}>{labelNode}</label>
          {helpNode}
          <input
            id={id}
            className="input"
            type="number"
            inputMode="numeric"
            min={field.min}
            max={field.max}
            value={typeof value === 'number' ? value : ''}
            disabled={disabled}
            aria-describedby={describedBy}
            onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          />
          {errorNode}
        </div>
      );

    case 'date':
      return (
        <div className={`field${error ? ' has-error' : ''}`}>
          <label htmlFor={id}>{labelNode}</label>
          {helpNode}
          <input
            id={id}
            className="input"
            type="date"
            value={typeof value === 'string' ? value : ''}
            disabled={disabled}
            aria-describedby={describedBy}
            onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
          />
          {errorNode}
        </div>
      );

    case 'text':
      return (
        <div className={`field${error ? ' has-error' : ''}`}>
          <label htmlFor={id}>{labelNode}</label>
          {helpNode}
          <input
            id={id}
            className="input"
            type="text"
            autoComplete="off"
            maxLength={field.maxLength}
            value={typeof value === 'string' ? value : ''}
            disabled={disabled}
            aria-describedby={describedBy}
            onChange={(e) => onChange(e.target.value)}
          />
          {errorNode}
        </div>
      );
  }
}
