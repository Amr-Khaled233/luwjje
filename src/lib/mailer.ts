/**
 * Outbound email, for the one message this store sends: the dashboard
 * password reset link.
 *
 * Three transports, tried in order, so whatever the host already has works:
 *
 *   RESEND_API_KEY   → Resend's HTTP API. Called with `fetch`, so it costs no
 *                      dependency and runs anywhere.
 *   SMTP_HOST + …    → any mailbox, including a Gmail app password.
 *   neither          → the message is printed to the server log. Development
 *                      only; `sendMail` reports it as undelivered so nothing
 *                      upstream mistakes it for a real send.
 */

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export type MailResult =
  | { ok: true; transport: 'resend' | 'smtp' }
  | { ok: false; transport: 'console' | 'none'; reason: string };

function sender() {
  // Resend rejects a bare address on an unverified domain; onboarding@resend.dev
  // always works and is the right default until a domain is added.
  return process.env.MAIL_FROM || 'luwjje <onboarding@resend.dev>';
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Where reset links go. One fixed address, never taken from a form. */
export function recoveryAddress(): string | null {
  const value = process.env.PASSWORD_RESET_EMAIL?.trim();
  return value && EMAIL_RE.test(value) ? value : null;
}

/**
 * Where a "new order" alert goes. `ORDER_NOTIFICATION_EMAIL` if set, otherwise
 * the recovery address the owner already configured — so a store that set up
 * password resets gets order alerts with no extra config.
 */
export function notificationAddress(): string | null {
  const value = process.env.ORDER_NOTIFICATION_EMAIL?.trim();
  if (value && EMAIL_RE.test(value)) return value;
  return recoveryAddress();
}

/**
 * `a***@gmail.com` — enough for the operator to recognise their own address
 * without printing it in full on an unauthenticated page.
 */
export function maskAddress(address: string) {
  const [user, domain] = address.split('@');
  if (!domain) return '•••';
  const head = user.slice(0, 1);
  return `${head}${'*'.repeat(Math.max(2, user.length - 1))}@${domain}`;
}

async function sendViaResend(message: MailMessage, apiKey: string): Promise<MailResult> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: sender(),
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });

  if (response.ok) return { ok: true, transport: 'resend' };

  const detail = await response.text().catch(() => '');
  throw new Error(`Resend refused the message (${response.status}): ${detail.slice(0, 300)}`);
}

async function sendViaSmtp(message: MailMessage): Promise<MailResult> {
  // Imported lazily so the dependency never reaches a bundle that will not use it.
  const nodemailer = (await import('nodemailer')).default;

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    // 465 is implicit TLS; 587 upgrades with STARTTLS.
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
  });

  await transport.sendMail({
    from: sender(),
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });

  return { ok: true, transport: 'smtp' };
}

export async function sendMail(message: MailMessage): Promise<MailResult> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) return sendViaResend(message, resendKey);

  if (process.env.SMTP_HOST) return sendViaSmtp(message);

  console.warn(
    `\n[mail] No transport configured — printing instead of sending.\n` +
      `  To:      ${message.to}\n` +
      `  Subject: ${message.subject}\n\n${message.text}\n`,
  );
  return {
    ok: false,
    transport: 'console',
    reason: 'No RESEND_API_KEY or SMTP_HOST is set.',
  };
}
