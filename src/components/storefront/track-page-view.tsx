'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Records a page view so the Shoppers funnel and the source split come from
 * real visits.
 *
 * Where a visitor came from is decided in this order:
 *
 *   1. a `?ref=` tag on the link — the reliable signal, because you set it.
 *      Instagram's in-app browser usually strips the referrer, so a bio link
 *      to `/?ref=instagram` is the only way its clicks are not miscounted as
 *      "typed the address". Facebook keeps its referrer, but the tag is still
 *      exact.
 *   2. the browser's referrer — for anyone who arrived without a tag.
 *
 * The chosen source is first-touch: it is remembered for the session, so every
 * later page keeps the source the visitor actually arrived from rather than
 * overwriting it with "internal" on the second click.
 */
const REF_KEY = 'luwjje-ref';
const SESSION_KEY = 'luwjje-session';

/** A tag we will store — letters, numbers and dashes, trimmed and capped. */
function cleanRef(value: string | null) {
  if (!value) return null;
  const slug = value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
  return slug || null;
}

export function TrackPageView() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith('/dashboard')) return;

    let sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }

    // First-touch source. A tag on the current URL wins and is remembered;
    // otherwise a source already stored for this session stands; otherwise the
    // browser referrer, once. Read from the live URL rather than
    // useSearchParams so the component needs no Suspense boundary.
    const tagged = cleanRef(new URLSearchParams(window.location.search).get('ref'));
    let source = sessionStorage.getItem(REF_KEY);

    if (tagged) {
      source = tagged;
      sessionStorage.setItem(REF_KEY, tagged);
    } else if (!source) {
      const host = document.referrer
        ? new URL(document.referrer).hostname.replace(/^www\./, '')
        : 'direct';
      source = host === window.location.hostname ? 'direct' : host;
      sessionStorage.setItem(REF_KEY, source);
    }

    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname, referrer: source, sessionId }),
      keepalive: true,
    }).catch(() => {
      /* analytics must never break a page */
    });
  }, [pathname]);

  return null;
}
