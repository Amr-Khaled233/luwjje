'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { FieldLabel } from '@/components/ui/field';
import { lookupOrder, type LookupState } from '@/app/actions/order-lookup';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="label-caps mt-2 flex h-14 w-full items-center justify-center gap-2 border border-navy bg-navy text-background transition-colors hover:bg-[#060f1c] disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Looking…
        </>
      ) : (
        'Find my order'
      )}
    </button>
  );
}

export function OrderLookupForm() {
  const [state, formAction] = useFormState<LookupState, FormData>(lookupOrder, {});

  return (
    <form action={formAction} className="mt-stack-md flex flex-col gap-6">
      <div>
        <FieldLabel htmlFor="orderNumber" required>
          Order Number
        </FieldLabel>
        <input
          id="orderNumber"
          name="orderNumber"
          required
          placeholder="LW-8F3K2A"
          className="h-12 w-full border border-outline-variant bg-background px-4 text-body-md uppercase transition-colors placeholder:normal-case placeholder:text-tertiary focus:border-navy focus:outline-none"
        />
      </div>

      <div>
        <FieldLabel htmlFor="email" required>
          Email
        </FieldLabel>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="h-12 w-full border border-outline-variant bg-background px-4 text-body-md transition-colors focus:border-navy focus:outline-none"
        />
      </div>

      {state.error && (
        <p role="alert" className="border border-error p-3 text-body-sm text-error">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
