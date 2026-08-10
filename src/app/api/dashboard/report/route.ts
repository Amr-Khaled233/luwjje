import { NextResponse } from 'next/server';
import { subDays, startOfDay, format } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { isDashboardUser } from '@/lib/dashboard-auth';

function csvCell(value: unknown) {
  const s = String(value ?? '');
  // Guard against CSV/formula injection when the file is opened in a spreadsheet.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Exports the orders behind the dashboard figures as CSV. */
export async function GET(req: Request) {
  if (!(await isDashboardUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const days = Number(new URL(req.url).searchParams.get('days')) || 30;
  const start = startOfDay(subDays(new Date(), days - 1));

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: start } },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });

  const header = [
    'Order Number',
    'Date',
    'Customer',
    'Email',
    'Governorate',
    'Status',
    'Payment',
    'Items',
    'Subtotal',
    'Shipping',
    'Discount',
    'Promo Code',
    'Total',
  ];

  const lines = [header.map(csvCell).join(',')];
  for (const o of orders) {
    lines.push(
      [
        o.orderNumber,
        format(o.createdAt, 'yyyy-MM-dd HH:mm'),
        o.fullName,
        o.email,
        o.governorate,
        o.status,
        o.paymentStatus,
        o.items.map((i) => `${i.name} x${i.quantity}`).join(' | '),
        o.subtotal.toFixed(2),
        o.shippingCost.toFixed(2),
        o.discount.toFixed(2),
        o.promoCode ?? '',
        o.total.toFixed(2),
      ]
        .map(csvCell)
        .join(','),
    );
  }

  // BOM so Excel reads UTF-8 correctly.
  const csv = '﻿' + lines.join('\r\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="luwjje-report-${format(new Date(), 'yyyy-MM-dd')}-${days}d.csv"`,
    },
  });
}
