import { useId, type ReactNode } from 'react';

/** Shared look for text inputs, selects, and textareas. 16px text on phones stops iOS zooming on focus. */
export const CONTROL_CLASS =
  'w-full rounded-sm border border-line-strong bg-surface px-3 py-2 text-base text-ink placeholder:text-ink-muted aria-invalid:border-danger-ink sm:text-sm';

export interface ControlProps {
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': true | undefined;
  'aria-required': true | undefined;
}

interface FieldProps {
  label: string;
  /** Receives the attributes that tie the control to its label, hint, and error. */
  children: (control: ControlProps) => ReactNode;
  hint?: string;
  error?: string | null;
  required?: boolean;
}

/**
 * A labelled form control with optional hint and inline error. The error sits
 * under the field it belongs to and is announced when it appears.
 */
export function Field({ label, children, hint, error, required = false }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink">
        {label}
        {required ? (
          <span aria-hidden className="ml-0.5 text-danger-ink">
            *
          </span>
        ) : null}
      </label>
      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        'aria-required': required ? true : undefined,
      })}
      {hint ? (
        <p id={hintId} className="mt-1 text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="mt-1 text-xs font-medium text-danger-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}
