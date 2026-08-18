'use client';

import * as React from 'react';
import Link from 'next/link';
import { useFormState, useFormStatus } from 'react-dom';
import { Loader2, Eye, EyeOff, Check } from 'lucide-react';
import { FieldLabel, FieldError, FieldHint } from '@/components/ui/field';
import { completeReset, type ResetState } from '@/app/actions/password-reset';

export interface ResetLabels {
  title: string;
  intro: string;
  newPassword: string;
  confirmPassword: string;
  minLength: string;
  save: string;
  saving: string;
  doneTitle: string;
  doneBody: string;
  signIn: string;
  show: string;
  hide: string;
}

function SubmitButton({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="label-caps mt-8 flex h-12 w-full items-center justify-center gap-2 border border-navy bg-navy text-background transition-[background-color,transform] hover:bg-[#060f1c] active:scale-[0.98] disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> {busy}
        </>
      ) : (
        idle
      )}
    </button>
  );
}

/** A password box with a reveal toggle, used for both fields. */
function PasswordField({
  name,
  label,
  hint,
  error,
  show,
  hide,
}: {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  show: string;
  hide: string;
}) {
  const [visible, setVisible] = React.useState(false);
  const id = React.useId();

  return (
    <div>
      <FieldLabel htmlFor={id} required>
        {label}
      </FieldLabel>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete="new-password"
          required
          minLength={8}
          aria-invalid={Boolean(error)}
          className="h-12 w-full border border-outline-variant bg-background px-4 pe-12 text-body-md transition-colors focus:border-navy focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hide : show}
          className="absolute end-3 top-1/2 -translate-y-1/2 text-secondary transition-colors hover:text-on-surface"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <FieldError>{error}</FieldError>
      {!error && hint && <FieldHint>{hint}</FieldHint>}
    </div>
  );
}

export function ResetForm({ token, labels }: { token: string; labels: ResetLabels }) {
  const [state, formAction] = useFormState<ResetState, FormData>(completeReset, {});

  if (state.done) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center gap-3">
          <Check className="h-5 w-5 shrink-0 text-navy" />
          <h1 className="font-display text-title-md sm:text-headline-sm">{labels.doneTitle}</h1>
        </div>
        <p className="mt-3 text-body-sm text-secondary">{labels.doneBody}</p>
        <Link
          href="/dashboard/login"
          className="label-caps mt-6 flex h-12 w-full items-center justify-center border border-navy bg-navy text-background transition-colors hover:bg-[#060f1c]"
        >
          {labels.signIn}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="token" value={token} />

      <h1 className="font-display text-title-md sm:text-headline-sm">{labels.title}</h1>
      <p className="mt-2 text-body-sm text-secondary">{labels.intro}</p>

      <div className="mt-6 flex flex-col gap-5">
        <PasswordField
          name="newPassword"
          label={labels.newPassword}
          hint={labels.minLength}
          error={state.fieldErrors?.newPassword}
          show={labels.show}
          hide={labels.hide}
        />
        <PasswordField
          name="confirmPassword"
          label={labels.confirmPassword}
          error={state.fieldErrors?.confirmPassword}
          show={labels.show}
          hide={labels.hide}
        />
      </div>

      {state.error && !state.fieldErrors && (
        <p role="alert" className="mt-4 animate-fade-down border border-error p-3 text-body-sm text-error">
          {state.error}
        </p>
      )}

      <SubmitButton idle={labels.save} busy={labels.saving} />
    </form>
  );
}
