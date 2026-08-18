import { prisma } from './prisma';
import { sendMail, recoveryAddress, maskAddress } from './mailer';
import type { Locale } from './../i18n/config';

/**
 * "Forgot password" for the single dashboard login.
 *
 * The link always goes to one fixed address from PASSWORD_RESET_EMAIL — never
 * to an address typed into the form. That removes the usual attack on this
 * flow entirely: there is no recipient to poison, so an anonymous request can
 * at worst send mail to the owner.
 *
 * Only the SHA-256 of the token is stored. A token is single-use, expires in
 * 30 minutes, and issuing one voids any earlier outstanding link.
 */

const TTL_MINUTES = 30;

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function baseUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  return configured || 'http://localhost:3000';
}

export type RequestResult =
  | { ok: true; maskedEmail: string; delivered: boolean }
  | { ok: false; reason: 'not-configured' | 'send-failed' };

function body(link: string, storeName: string, locale: Locale) {
  if (locale === 'ar') {
    return {
      subject: `${storeName} — إعادة تعيين كلمة مرور لوحة التحكم`,
      text:
        `طلب أحدهم إعادة تعيين كلمة مرور لوحة تحكم ${storeName}.\n\n` +
        `افتح الرابط التالي خلال ${TTL_MINUTES} دقيقة:\n${link}\n\n` +
        `الرابط يعمل مرة واحدة فقط. إذا لم تطلب هذا، تجاهل الرسالة — لم يتغيّر شيء.`,
      heading: 'إعادة تعيين كلمة المرور',
      intro: `طلب أحدهم إعادة تعيين كلمة مرور لوحة تحكم ${storeName}.`,
      button: 'اختر كلمة مرور جديدة',
      note: `الرابط صالح ${TTL_MINUTES} دقيقة ويعمل مرة واحدة. إذا لم تطلب هذا، تجاهل الرسالة — لم يتغيّر شيء.`,
    };
  }
  return {
    subject: `${storeName} — reset your dashboard password`,
    text:
      `Someone asked to reset the ${storeName} dashboard password.\n\n` +
      `Open this link within ${TTL_MINUTES} minutes:\n${link}\n\n` +
      `It works once. If this was not you, ignore this email — nothing has changed.`,
    heading: 'Reset your password',
    intro: `Someone asked to reset the ${storeName} dashboard password.`,
    button: 'Choose a new password',
    note: `The link is valid for ${TTL_MINUTES} minutes and works once. If this was not you, ignore this email — nothing has changed.`,
  };
}

/** Issues a link and mails it to the configured recovery address. */
export async function requestPasswordReset(
  storeName: string,
  locale: Locale = 'en',
): Promise<RequestResult> {
  const to = recoveryAddress();
  if (!to) return { ok: false, reason: 'not-configured' };

  const token = newToken();
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + TTL_MINUTES * 60 * 1000);

  // One outstanding link at a time: asking again voids the previous email.
  await prisma.passwordReset.deleteMany({ where: { usedAt: null } });
  await prisma.passwordReset.create({ data: { tokenHash, expiresAt } });

  const link = `${baseUrl()}/dashboard/reset?token=${token}`;
  const copy = body(link, storeName, locale);
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  const html = `<!doctype html><html dir="${dir}"><body style="margin:0;background:#f8f9ff;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0b1c30">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px">
    <p style="margin:0 0 32px;font-size:22px;font-weight:500;letter-spacing:-0.01em">${storeName}</p>
    <div style="border:1px solid #c4c7c9;background:#ffffff;padding:32px">
      <h1 style="margin:0 0 16px;font-size:20px;font-weight:600">${copy.heading}</h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#565e74">${copy.intro}</p>
      <a href="${link}" style="display:inline-block;background:#0b1c30;color:#f8f9ff;text-decoration:none;padding:14px 28px;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase">${copy.button}</a>
      <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#747879">${copy.note}</p>
    </div>
    <p style="margin:24px 0 0;font-size:12px;color:#747879;word-break:break-all">${link}</p>
  </div>
</body></html>`;

  try {
    const sent = await sendMail({ to, subject: copy.subject, text: copy.text, html });
    return { ok: true, maskedEmail: maskAddress(to), delivered: sent.ok };
  } catch (error) {
    console.error('password reset email failed', error);
    return { ok: false, reason: 'send-failed' };
  }
}

export type TokenState = 'valid' | 'expired' | 'used' | 'unknown';

export async function checkResetToken(token: string | undefined): Promise<TokenState> {
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return 'unknown';

  const record = await prisma.passwordReset.findUnique({
    where: { tokenHash: await sha256(token) },
  });

  if (!record) return 'unknown';
  if (record.usedAt) return 'used';
  if (record.expiresAt.getTime() < Date.now()) return 'expired';
  return 'valid';
}

/**
 * Consumes the token and stores the new password. Marking the row used and
 * writing the hash happen in one transaction, so a token cannot be spent twice
 * by two requests arriving together.
 *
 * Bumping `sessionEpoch` signs out every session already open — without it,
 * whoever forced the reset would still be inside.
 */
export async function consumeResetToken(token: string, newPassword: string): Promise<TokenState> {
  const state = await checkResetToken(token);
  if (state !== 'valid') return state;

  const bcrypt = (await import('bcryptjs')).default;
  const hash = await bcrypt.hash(newPassword, 10);
  const tokenHash = await sha256(token);

  try {
    await prisma.$transaction(async (tx) => {
      // Claiming the row first makes the race lose loudly rather than silently.
      const claimed = await tx.passwordReset.updateMany({
        where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (claimed.count === 0) throw new Error('ALREADY_USED');

      await tx.siteSettings.upsert({
        where: { id: 'singleton' },
        update: { dashboardPasswordHash: hash, sessionEpoch: { increment: 1 } },
        create: { id: 'singleton', dashboardPasswordHash: hash, sessionEpoch: 1 },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'ALREADY_USED') return 'used';
    throw error;
  }

  return 'valid';
}

/** Housekeeping: drop links that can no longer be used. */
export async function purgeExpiredResets() {
  await prisma.passwordReset.deleteMany({
    where: { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
}
