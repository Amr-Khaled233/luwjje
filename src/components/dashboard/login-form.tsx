'use client';

import * as React from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { FieldLabel } from '@/components/ui/field';
import { login, type LoginState } from '@/app/actions/dashboard-session';

/** Plain strings, because a function cannot cross the Server → Client boundary. */
export interface LoginLabels {
  password: string;
  show: string;
  hide: string;
  submit: string;
  checking: string;
}

function SubmitButton({ labels }: { labels: LoginLabels }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="label-caps mt-6 flex h-12 w-full items-center justify-center gap-2 border border-navy bg-navy text-background transition-colors hover:bg-[#060f1c] disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> {labels.checking}
        </>
      ) : (
        labels.submit
      )}
    </button>
  );
}

export function LoginForm({ next, labels }: { next: string; labels: LoginLabels }) {
  const [state, formAction] = useFormState<LoginState, FormData>(login, {});
  const [visible, setVisible] = React.useState(false);

  return (
    <form action={formAction} className="mt-8">
      <input type="hidden" name="next" value={next} />

      <FieldLabel htmlFor="password">{labels.password}</FieldLabel>
      <div className="relative">
        <input
          id="password"
          name="password"
          type={visible ? 'text' : 'password'}
          autoComplete="current-password"
          autoFocus
          required
          className="h-12 w-full border border-outline-variant bg-background px-4 pe-12 text-body-md transition-colors focus:border-navy focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? labels.hide : labels.show}
          className="absolute end-3 top-1/2 -translate-y-1/2 text-secondary transition-colors hover:text-on-surface"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {state.error && (
        <p role="alert" className="mt-3 border border-error p-3 text-body-sm text-error">
          {state.error}
        </p>
      )}

      <SubmitButton labels={labels} />
    </form>
  );
}
