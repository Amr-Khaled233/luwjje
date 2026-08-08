'use client';

import * as React from 'react';
import { ArrowRight } from 'lucide-react';

export function NewsletterForm() {
  const [email, setEmail] = React.useState('');
  const [state, setState] = React.useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = React.useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('loading');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
      setState('done');
      setMessage(data.message);
      setEmail('');
    } catch (err) {
      setState('error');
      setMessage(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  if (state === 'done') {
    return <p className="text-body-sm text-on-surface">{message}</p>;
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="flex border border-outline-variant focus-within:border-navy">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          className="h-12 min-w-0 flex-1 bg-transparent px-4 text-body-sm outline-none placeholder:text-tertiary"
        />
        <button
          type="submit"
          disabled={state === 'loading'}
          aria-label="Subscribe"
          className="flex h-12 w-12 shrink-0 items-center justify-center border-l border-outline-variant transition-colors hover:bg-navy hover:text-background disabled:opacity-50"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      {state === 'error' && <p className="mt-2 text-body-sm text-error">{message}</p>}
    </form>
  );
}
