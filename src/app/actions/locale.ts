'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { LOCALE_COOKIE, isLocale } from '@/i18n/config';

/** Stores the visitor's language choice for a year. */
export async function setLocale(next: string) {
  if (!isLocale(next)) return;

  cookies().set(LOCALE_COOKIE, next, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });

  revalidatePath('/', 'layout');
}
