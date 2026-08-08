import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { emailSchema } from '@/lib/validations';

export async function POST(req: Request) {
  const parsed = z.object({ email: emailSchema }).safeParse(await req.json());
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
