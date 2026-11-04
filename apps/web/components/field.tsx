import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

import { focusRing } from './focus';
import { Icon } from './icon';

// Form fields from the prototype's portal-shell.jsx: a label, the control,
// and an optional hint or error tied to the control with aria-describedby.

export function describedBy(id: string, hint?: ReactNode, error?: ReactNode): string | undefined {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(' ') : undefined;
}

export interface FieldProps {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}

export function Field({ id, label, hint, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[12px] font-semibold text-text">
        {label}
      </label>
      {children}
      {hint ? (
        <span id={`${id}-hint`} className="text-[11.5px] text-muted">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={`${id}-error`} className="text-[11.5px] font-medium text-rejected">
          {error}
        </span>
      ) : null}
    </div>
  );
}

const CONTROL =
  'min-h-[38px] w-full rounded-[10px] border bg-paper px-3 text-[13px] text-text placeholder:text-subtle disabled:bg-paper2 disabled:text-muted read-only:bg-paper2 read-only:text-muted';

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  mono?: boolean;
}

export function TextInput({
  invalid = false,
  mono = false,
  className = '',
  ...rest
}: TextInputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={`${CONTROL} ${invalid ? 'border-rejected' : 'border-line'} ${mono ? 'font-mono' : ''} ${focusRing} ${className}`}
      {...rest}
    />
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

// A native <select>, styled like the prototype's Select.
export function Select({ invalid = false, className = '', children, ...rest }: SelectProps) {
  return (
    <div className={`relative ${className}`}>
      <select
        aria-invalid={invalid || undefined}
        className={`${CONTROL} h-[38px] appearance-none pr-9 ${invalid ? 'border-rejected' : 'border-line'} ${focusRing}`}
        {...rest}
      >
        {children}
      </select>
      <Icon
        name="chevronDown"
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
      />
    </div>
  );
}
