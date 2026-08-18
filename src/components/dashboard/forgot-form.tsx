'use client';

import * as React from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Loader2, MailCheck, AlertTriangle } from 'lucide-react';
import { requestReset, type ForgotState } from '@/app/actions/password-reset';
import { fmt } from '@/i18n/dictionaries';

export interface ForgotLabels {
  title: string;
  intro: string;
  send: string;
  sending: string;
  sentTitle: string;
  sentBody: string;
  sentAgain: string;
  undelivered: string;
}

function SubmitButton({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="label-caps mt-6 flex h-12 w-full items-center justify-center gap-2 border border-navy bg-navy text-background transition-[background-color,transform] hover:bg-[#060f1c] active:scale-[0.98] disabled:opacity-60"
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

export function ForgotForm({ labels }: { labels: ForgotLabels }) {
  const [state, formAction] = useFormState<ForgotState, FormData>(requestReset, {});

  if (state.sent) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center gap-3">
          <MailCheck className="h-5 w-5 shrink-0 text-navy" />
          <h1 className="font-display text-title-md sm:text-headline-sm">{labels.sentTitle}</h1>
        </div>
        <p className="mt-3 text-body-sm text-secondary">
          {fmt(labels.sentBody, { email: state.maskedEmail ?? '' })}
        </p>

        {state.undelivered && (
          <p className="mt-4 flex gap-2 border border-outline-variant bg-surface-low p-3 text-body-sm text-secondary">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {labels.undelivered}
          </p>
        )}

        {/* Asking again voids the previous link, which is the safe direction. */}
        <form action={formAction}>
          <SubmitButton idle={labels.sentAgain} busy={labels.sending} />
        </form>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <h1 className="font-display text-title-md sm:text-headline-sm">{labels.title}</h1>
      <p className="mt-2 text-body-sm text-secondary">{labels.intro}</p>

      {/*
        No email field. The recipient is fixed in the environment, so there is
        nothing here for an attacker to point somewhere else.
      */}

      {state.error && (
        <p role="alert" className="mt-4 animate-fade-down border border-error p-3 text-body-sm text-error">
          {state.error}
        </p>
      )}

      <SubmitButton idle={labels.send} busy={labels.sending} />
    </form>
  );
}
