'use server';

import { cookies } from 'next/headers';
import {
  requestPasswordReset,
  consumeResetToken,
  purgeExpiredResets,
} from '@/lib/password-reset';
import { newPasswordSchema } from '@/lib/validations';
import { getSettings } from '@/lib/settings';
import { getLocale } from '@/i18n/server';
import { getDashboardDictionary } from '@/i18n/dashboard-dictionary';
import { rateLimit, clientKey } from '@/lib/rate-limit';
import { COOKIE_NAME } from '@/lib/session-token';

export interface ForgotState {
  sent?: boolean;
  maskedEmail?: string;
  /** True when the mail transport is missing, so the link was only logged. */
  undelivered?: boolean;
  error?: string;
}

/**
 * Anyone can trigger this — there is no session yet. It is safe because the
 * recipient is fixed in the environment: the worst an attacker achieves is
 * sending the owner an email they did not ask for, which the rate limit caps
 * at three an hour.
 */
export async function requestReset(_prev: ForgotState, _formData: FormData): Promise<ForgotState> {
  const locale = await getLocale();
  const d = getDashboardDictionary(locale).reset;

  const limit = rateLimit(clientKey('password-reset'), 3, 60 * 60 * 1000);
  if (!limit.ok) {
    return { error: d.throttled };
  }

  const settings = await getSettings();
  const result = await requestPasswordReset(settings.storeName, locale);

  if (!result.ok) {
    return { error: result.reason === 'not-configured' ? d.notConfigured : d.sendFailed };
  }

  void purgeExpiredResets();
  return { sent: true, maskedEmail: result.maskedEmail, undelivered: !result.delivered };
}

export interface ResetState {
  error?: string;
  fieldErrors?: Record<string, string>;
  done?: boolean;
}

export async function completeReset(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const locale = await getLocale();
  const d = getDashboardDictionary(locale).reset;

  const limit = rateLimit(clientKey('password-reset-complete'), 10, 60 * 60 * 1000);
  if (!limit.ok) return { error: d.throttled };

  const parsed = newPasswordSchema.safeParse({
    token: String(formData.get('token') ?? ''),
    newPassword: String(formData.get('newPassword') ?? ''),
    confirmPassword: String(formData.get('confirmPassword') ?? ''),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join('.')] = issue.message;
    return { error: parsed.error.issues[0]?.message, fieldErrors };
  }

  const state = await consumeResetToken(parsed.data.token, parsed.data.newPassword);
  if (state !== 'valid') {
    return { error: state === 'expired' ? d.linkExpired : d.linkUsed };
  }

  // The epoch just moved, so this browser's own session — if it had one — is
  // now stale too. Clearing it avoids a confusing half-signed-in state.
  cookies().delete(COOKIE_NAME);

  return { done: true };
}
