'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Records a page view so the dashboard's conversion rate and traffic-source
 * breakdown come from real visits rather than a constant.
 */
export function TrackPageView() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith('/dashboard')) return;

    let sessionId = sessionStorage.getItem('luwjje-session');
    if (!sessionId) {
      sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem('luwjje-session', sessionId);
    }

    const referrer = document.referrer
      ? new URL(document.referrer).hostname.replace(/^www\./, '')
      : 'direct';

    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: pathname,
        referrer: referrer === window.location.hostname ? 'internal' : referrer,
        sessionId,
      }),
      keepalive: true,
    }).catch(() => {
      /* analytics must never break a page */
    });
  }, [pathname]);

  return null;
}
