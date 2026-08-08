'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const controlBase =
  'w-full bg-background text-on-surface text-body-md border border-outline-variant px-4 transition-colors duration-200 ease-scandi placeholder:text-tertiary focus:border-navy focus:outline-none disabled:bg-surface-low disabled:text-tertiary';

export function FieldLabel({
  htmlFor,
  children,
  required,
  className,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn('label-caps mb-2 block text-secondary', className)}>
      {children}
      {required && <span className="text-error"> *</span>}
    </label>
  );
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-1.5 text-body-sm text-error">{children}</p>;
}

export function FieldHint({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-1.5 text-body-sm text-secondary">{children}</p>;
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, containerClassName, id, required, ...props }, ref) => {
    const generated = React.useId();
    const inputId = id ?? generated;
    return (
      <div className={containerClassName}>
        {label && (
          <FieldLabel htmlFor={inputId} required={required}>
            {label}
          </FieldLabel>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          className={cn(controlBase, 'h-12', error && 'border-error focus:border-error', className)}
          {...props}
        />
        <FieldError>{error}</FieldError>
        {!error && <FieldHint>{hint}</FieldHint>}
      </div>
    );
  },
);
Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, containerClassName, id, required, rows = 4, ...props }, ref) => {
    const generated = React.useId();
    const inputId = id ?? generated;
    return (
      <div className={containerClassName}>
        {label && (
          <FieldLabel htmlFor={inputId} required={required}>
            {label}
          </FieldLabel>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          aria-invalid={Boolean(error)}
          className={cn(controlBase, 'py-3 leading-6', error && 'border-error focus:border-error', className)}
          {...props}
        />
        <FieldError>{error}</FieldError>
        {!error && <FieldHint>{hint}</FieldHint>}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, className, containerClassName, id, required, children, ...props }, ref) => {
    const generated = React.useId();
    const inputId = id ?? generated;
    return (
      <div className={containerClassName}>
        {label && (
          <FieldLabel htmlFor={inputId} required={required}>
            {label}
          </FieldLabel>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            aria-invalid={Boolean(error)}
            className={cn(
              controlBase,
              'select-reset h-12 cursor-pointer',
              error && 'border-error focus:border-error',
              className,
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary"
          />
        </div>
        <FieldError>{error}</FieldError>
        {!error && <FieldHint>{hint}</FieldHint>}
      </div>
    );
  },
);
Select.displayName = 'Select';

export function Checkbox({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: React.ReactNode }) {
  const id = React.useId();
  return (
    <label htmlFor={props.id ?? id} className="flex cursor-pointer items-center gap-3 select-none">
      <input
        type="checkbox"
        id={props.id ?? id}
        className={cn(
          'h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-sm border border-outline-variant bg-background transition-colors',
          'checked:border-navy checked:bg-navy',
          "checked:bg-[url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%23f8f9ff' stroke-width='2'><path d='M3 8.5 6.5 12 13 5'/></svg>\")] checked:bg-center checked:bg-no-repeat",
          className,
        )}
        {...props}
      />
      {label && <span className="text-body-sm text-secondary">{label}</span>}
    </label>
  );
}
