import { NextResponse } from 'next/server';
import { rateLimit, requestKey } from '@/lib/rate-limit';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  path: z.string().max(300),
  referrer: z.string().max(200).default('direct'),
  sessionId: z.string().max(80),
});

export async function POST(req: Request) {
  const limit = rateLimit(requestKey(req, 'track'), 300, 3600000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

    await prisma.pageView.create({ data: parsed.data });
    return NextResponse.json({ ok: true });
  } catch {
    // Never surface analytics failures to the visitor.
    return NextResponse.json({ ok: false });
  }
}
