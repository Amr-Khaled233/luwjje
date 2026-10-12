'use client';

import * as React from 'react';
import { Copy, Check } from 'lucide-react';
import { useDash } from './dashboard-i18n';

/**
 * The tagged links to hand out. Instagram's in-app browser strips the
 * referrer, so a plain link is miscounted — these carry `?ref=` so an arrival
 * from each is credited to it. Built from the store's real domain (handed in
 * by the page), never from whichever address the dashboard happens to be open
 * on — so they always read luwjje.com — and copied with one tap.
 */
function RefRow({ label, url }: { label: string; url: string }) {
  const { d } = useDash();
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the field is selectable as a fallback */
    }
  }

  return (
    <div className="flex flex-col gap-2 border border-outline-variant p-4 sm:flex-row sm:items-center sm:gap-4">
      <span className="label-caps w-28 shrink-0 text-secondary">{label}</span>
      <code
        dir="ltr"
        className="min-w-0 flex-1 select-all overflow-x-auto whitespace-nowrap text-body-sm text-on-surface"
      >
        {url}
      </code>
      <button
        type="button"
        onClick={copy}
        className="flex h-9 shrink-0 items-center justify-center gap-2 border border-outline-variant px-4 text-label-md transition-colors hover:border-navy"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-navy" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? d.shoppers.copied : d.shoppers.copy}
      </button>
    </div>
  );
}

export function RefLinks({ baseUrl }: { baseUrl: string }) {
  const { d } = useDash();

  return (
    <div>
      <header className="mb-5 md:mb-6">
        <h2 className="font-display text-title-md md:text-headline-sm">{d.shoppers.linksTitle}</h2>
        <p className="mt-1.5 text-body-sm text-secondary">{d.shoppers.linksHint}</p>
      </header>

      <div className="flex flex-col gap-3">
        <RefRow label={d.shoppers.instagram} url={`${baseUrl}/?ref=instagram`} />
        <RefRow label={d.shoppers.facebook} url={`${baseUrl}/?ref=facebook`} />
      </div>
    </div>
  );
}
