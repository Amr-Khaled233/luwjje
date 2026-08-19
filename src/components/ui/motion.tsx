'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Motion primitives.
 *
 * Deliberately hand-rolled on IntersectionObserver rather than pulling in an
 * animation library: the whole vocabulary is a fade and a 16px rise, and a
 * dependency for that would outweigh the CSS it replaces.
 *
 * Everything here degrades safely — `prefers-reduced-motion` is handled once
 * in globals.css, and an element whose observer never fires is revealed on
 * mount rather than left invisible.
 */

/** Shared observer: one instance for the whole page, not one per element. */
let observer: IntersectionObserver | null = null;
const revealed = new WeakSet<Element>();

function watch(element: HTMLElement) {
  if (typeof IntersectionObserver === 'undefined') {
    element.dataset.visible = 'true';
    return () => {};
  }

  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const node = entry.target as HTMLElement;
          node.dataset.visible = 'true';
          revealed.add(node);
          observer?.unobserve(node);
        }
      },
      // Fires a little before the element is fully on screen, so the motion
      // finishes as the reader arrives rather than starting then.
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    );
  }

  // Already above the fold on load: show it immediately, no animation frame lost.
  if (element.getBoundingClientRect().top < window.innerHeight) {
    element.dataset.visible = 'true';
    return () => {};
  }

  observer.observe(element);
  return () => observer?.unobserve(element);
}

export interface RevealProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Milliseconds to hold before this element moves — used to stagger a row. */
  delay?: number;
  /** Render as something other than a div (`section`, `li`, `article`…). */
  as?: 'div' | 'section' | 'article' | 'li' | 'span';
}

/** Fades and lifts its children into place the first time they scroll into view. */
export function Reveal({ delay = 0, as: Tag = 'div', className, style, ...rest }: RevealProps) {
  const ref = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (revealed.has(node)) {
      node.dataset.visible = 'true';
      return;
    }
    return watch(node as HTMLElement);
  }, []);

  // The tag is chosen at runtime, so the props are typed against the div case
  // and cast once here rather than being made generic over every element.
  const Element = Tag as React.ElementType;

  return (
    <Element
      ref={ref}
      className={cn('reveal', className)}
      style={{ ...style, ...(delay ? { ['--reveal-delay' as string]: `${delay}ms` } : null) }}
      {...rest}
    />
  );
}

/**
 * Locks background scrolling while a drawer or modal is open, without the
 * page jumping as the scrollbar disappears.
 */
export function useScrollLock(active: boolean) {
  React.useEffect(() => {
    if (!active) return;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = 'hidden';
    if (gap > 0) body.style.paddingRight = `${gap}px`;

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, [active]);
}

/**
 * Keeps a panel mounted for the length of its exit animation, so a drawer
 * slides out instead of vanishing. Returns whether to render, plus the state
 * to drive the class name.
 */
export function useExitAnimation(open: boolean, durationMs = 240) {
  const [mounted, setMounted] = React.useState(open);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const timer = window.setTimeout(() => setMounted(false), durationMs);
    return () => window.clearTimeout(timer);
  }, [open, durationMs]);

  return { mounted, closing: mounted && !open };
}

/**
 * Traps Tab inside an open dialog and restores focus to whatever opened it.
 * Not motion, but every drawer here needs it and they all already use this file.
 */
export function useFocusTrap(active: boolean) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;

    const opener = document.activeElement as HTMLElement | null;
    const selector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Tab' || !container) return;
      const focusable = Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
        (el) => el.offsetParent !== null,
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      opener?.focus?.();
    };
  }, [active]);

  return ref;
}
