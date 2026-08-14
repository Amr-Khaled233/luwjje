import { NextResponse } from 'next/server';
import { rateLimit, requestKey } from '@/lib/rate-limit';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { emailSchema } from '@/lib/validations';

export async function POST(req: Request) {
  const limit = rateLimit(requestKey(req, 'newsletter'), 20, 3600000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = z.object({ email: emailSchema }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Enter a valid email.' },
      { status: 400 },
    );
  }

  // Idempotent: re-subscribing is a no-op, not an error.
  await prisma.newsletterSubscriber.upsert({
    where: { email: parsed.data.email },
    update: {},
    create: { email: parsed.data.email },
  });

  return NextResponse.json({ ok: true, message: 'You are on the list.' });
}
