import { NextResponse } from 'next/server';
import { subDays, startOfDay, format } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { isDashboardUser } from '@/lib/dashboard-auth';
import { getSettings } from '@/lib/settings';

/** Exports the orders behind the dashboard figures as a real .xlsx workbook. */
export async function GET(req: Request) {
  if (!(await isDashboardUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const days = Number(new URL(req.url).searchParams.get('days')) || 30;
  const start = startOfDay(subDays(new Date(), days - 1));

  const [orders, settings] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: start } },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    }),
    getSettings(),
  ]);

  // Imported lazily so the (large) workbook library stays out of every other
  // dashboard route's bundle.
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = settings.storeName;
  workbook.created = new Date();

  const money = `"${settings.currencySymbol}" #,##0.00`;
  const NAVY = 'FF0B1C30';
  const PARCHMENT = 'FFF8F9FF';

  function styleHeader(sheet: import('exceljs').Worksheet) {
    const header = sheet.getRow(1);
    header.font = { bold: true, size: 11, color: { argb: PARCHMENT } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    header.alignment = { vertical: 'middle' };
    header.height = 22;
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columnCount },
    };
  }

  // ------------------------------------------------------------- orders
  const sheet = workbook.addWorksheet('Orders');
  sheet.columns = [
    { header: 'Order', key: 'orderNumber', width: 14 },
    { header: 'Date', key: 'date', width: 18 },
    { header: 'Customer', key: 'customer', width: 24 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Phone', key: 'phone', width: 16 },
    { header: 'Governorate', key: 'governorate', width: 16 },
    { header: 'Area', key: 'area', width: 18 },
    { header: 'Address', key: 'street', width: 32 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Payment', key: 'payment', width: 12 },
    { header: 'Items', key: 'items', width: 40 },
    { header: 'Qty', key: 'qty', width: 7 },
    { header: 'Subtotal', key: 'subtotal', width: 14, style: { numFmt: money } },
    { header: 'Shipping', key: 'shipping', width: 14, style: { numFmt: money } },
    { header: 'Discount', key: 'discount', width: 14, style: { numFmt: money } },
    { header: 'Promo', key: 'promo', width: 12 },
    { header: 'Total', key: 'total', width: 14, style: { numFmt: money } },
  ];

  for (const o of orders) {
    sheet.addRow({
      orderNumber: o.orderNumber,
      date: format(o.createdAt, 'yyyy-MM-dd HH:mm'),
      customer: o.fullName,
      email: o.email,
      phone: o.phone ?? '',
      governorate: o.governorate,
      area: o.area ?? '',
      street: o.street,
      status: o.status,
      payment: o.paymentStatus,
      items: o.items.map((i) => `${i.name} ×${i.quantity}`).join(', '),
      qty: o.items.reduce((n, i) => n + i.quantity, 0),
      subtotal: o.subtotal,
      shipping: o.shippingCost,
      discount: o.discount,
      promo: o.promoCode ?? '',
      total: o.total,
    });
  }
  styleHeader(sheet);

  // Totals row, so the file answers the obvious question without a formula.
  if (orders.length > 0) {
    const counted = orders.filter((o) => o.status !== 'CANCELLED');
    const totals = sheet.addRow({
      orderNumber: 'TOTAL',
      customer: `${counted.length} orders (excl. cancelled)`,
      qty: counted.reduce((n, o) => n + o.items.reduce((m, i) => m + i.quantity, 0), 0),
      subtotal: counted.reduce((s, o) => s + o.subtotal, 0),
      shipping: counted.reduce((s, o) => s + o.shippingCost, 0),
      discount: counted.reduce((s, o) => s + o.discount, 0),
      total: counted.reduce((s, o) => s + o.total, 0),
    });
    totals.font = { bold: true };
    totals.border = { top: { style: 'thin', color: { argb: NAVY } } };
  }

  // ------------------------------------------------------- product sales
  const byProduct = new Map<string, { qty: number; revenue: number }>();
  for (const o of orders) {
    if (o.status === 'CANCELLED') continue;
    for (const i of o.items) {
      const row = byProduct.get(i.name) ?? { qty: 0, revenue: 0 };
      row.qty += i.quantity;
      row.revenue += i.unitPrice * i.quantity;
      byProduct.set(i.name, row);
    }
  }

  const products = workbook.addWorksheet('Product sales');
  products.columns = [
    { header: 'Product', key: 'name', width: 34 },
    { header: 'Units sold', key: 'qty', width: 12 },
    { header: 'Revenue', key: 'revenue', width: 16, style: { numFmt: money } },
  ];
  for (const [name, v] of [...byProduct.entries()].sort((a, b) => b[1].revenue - a[1].revenue)) {
    products.addRow({ name, qty: v.qty, revenue: v.revenue });
  }
  styleHeader(products);

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `luwjje-report-${format(new Date(), 'yyyy-MM-dd')}-${days}d.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.byteLength),
    },
  });
}
