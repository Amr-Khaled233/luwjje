import * as React from 'react';

/**
 * React's `cache` de-duplicates a call across one server render, but it only
 * exists inside the react-server condition. Scripts (seed, smoke test) import
 * the same data helpers from plain Node, where it is undefined — so fall back
 * to the bare function there.
 */
export const requestCache: <A extends unknown[], R>(fn: (...args: A) => R) => (...args: A) => R =
  typeof (React as { cache?: unknown }).cache === 'function'
    ? (React.cache as never)
    : (fn) => fn;
