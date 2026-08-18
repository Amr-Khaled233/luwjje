'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  checkPassword,
  clearAttempts,
  newSessionToken,
  recordFailure,
  tooManyAttempts,
} from '@/lib/dashboard-auth';
import { COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '@/lib/session-token';
import { getLocale } from '@/i18n/server';
import { getDashboardDictionary } from '@/i18n/dashboard-dictionary';

export interface LoginState {
  error?: string;
}

/** Rough client identity for throttling — good enough behind a single proxy. */
function clientKey() {
  const h = headers();
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    h.get('x-real-ip') ??
    'local'
  );
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/dashboard');
  const key = clientKey();
  const d = getDashboardDictionary(await getLocale()).login;

  if (tooManyAttempts(key)) {
    return { error: d.throttled };
  }
  if (!password) {
    return { error: d.required };
  }

  if (!(await checkPassword(password))) {
    recordFailure(key);
    return { error: d.wrong };
  }

  clearAttempts(key);
  cookies().set(COOKIE_NAME, await newSessionToken(), SESSION_COOKIE_OPTIONS);

  // Only ever redirect inside the dashboard — never to an attacker's URL.
  redirect(next.startsWith('/dashboard') ? next : '/dashboard');
}

export async function logout() {
  cookies().delete(COOKIE_NAME);
  redirect('/dashboard/login');
}
