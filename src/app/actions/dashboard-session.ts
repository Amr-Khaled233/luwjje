'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  checkPassword,
  clearAttempts,
  recordFailure,
  tooManyAttempts,
} from '@/lib/dashboard-auth';
import { COOKIE_NAME, SESSION_COOKIE_OPTIONS, createSessionToken } from '@/lib/session-token';

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

  if (tooManyAttempts(key)) {
    return { error: 'Too many attempts. Try again in a few minutes.' };
  }
  if (!password) {
    return { error: 'Enter the password.' };
  }

  if (!(await checkPassword(password))) {
    recordFailure(key);
    return { error: 'That password is not correct.' };
  }

  clearAttempts(key);
  cookies().set(COOKIE_NAME, await createSessionToken(), SESSION_COOKIE_OPTIONS);

  // Only ever redirect inside the dashboard — never to an attacker's URL.
  redirect(next.startsWith('/dashboard') ? next : '/dashboard');
}

export async function logout() {
  cookies().delete(COOKIE_NAME);
  redirect('/dashboard/login');
}
