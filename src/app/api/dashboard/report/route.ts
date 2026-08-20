import { NextResponse } from 'next/server';
import { subDays, startOfDay, endOfDay, eachDayOfInterval, format } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { isDashboardUser } from '@/lib/dashboard-auth';
import { getSettings } from '@/lib/settings';

/**
 * Two workbooks over the same period, because they answer different questions.
 *
 *   ?report=summary — how the shop performed: a row per day, the products and
 *                     the categories that sold, and the totals.
 *   ?report=orders  — the orders themselves, one row each, for packing,
 *                     accounting or anything that needs the addresses.
 *
 * The period is `from`/`to` (inclusive, yyyy-mm-dd) or `days` back from today.
 */

const NAVY = 'FF0B1C30';
const PARCHMENT = 'FFF8F9FF';
const RULE = 'FFC4C7C9';

/** A yyyy-mm-dd that is actually a date, or null. */
function parseDay(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(req: Request) {
  if (!(await isDashboardUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = new URL(req.url).searchParams;
  const kind = params.get('report') === 'orders' ? 'orders' : 'summary';

  const fromParam = parseDay(params.get('from'));
  const toParam = parseDay(params.get('to'));

  let start: Date;
  let end: Date;

  if (fromParam && toParam) {
    // Tolerate the two being the wrong way round rather than returning nothing.
    start = startOfDay(fromParam <= toParam ? fromParam : toParam);
    end = endOfDay(fromParam <= toParam ? toParam : fromParam);
  } else {
    const days = Number(params.get('days')) || 30;
    end = endOfDay(new Date());
    start = startOfDay(subDays(new Date(), days - 1));
  }

  const [orders, settings] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: start, lte: end } },
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
  const period = `${format(start, 'd MMM yyyy')} – ${format(end, 'd MMM yyyy')}`;
  const counted = orders.filter((o) => o.status !== 'CANCELLED');

  function styleHeader(sheet: import('exceljs').Worksheet, row = 1) {
    const header = sheet.getRow(row);
    header.font = { bold: true, size: 11, color: { argb: PARCHMENT } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    header.alignment = { vertical: 'middle' };
    header.height = 22;
    sheet.views = [{ state: 'frozen', ySplit: row }];
    sheet.autoFilter = {
      from: { row, column: 1 },
      to: { row, column: sheet.columnCount },
    };
  }

  if (kind === 'orders') {
    buildOrdersSheet();
  } else {
    buildSummary();
  }

  // ------------------------------------------------------------- orders
  function buildOrdersSheet() {
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

    // Totals, so the file answers the obvious question without a formula.
    if (orders.length > 0) {
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
  }

  // ------------------------------------------------------------ summary
  function buildSummary() {
    const revenue = counted.reduce((s, o) => s + o.total, 0);
    const units = counted.reduce(
      (n, o) => n + o.items.reduce((m, i) => m + i.quantity, 0),
      0,
    );

    // -------------------------------------------------------- the figures
    const overview = workbook.addWorksheet('Summary');
    overview.columns = [
      { header: 'Figure', key: 'label', width: 30 },
      { header: 'Value', key: 'value', width: 22 },
    ];
    overview.addRows([
      { label: 'Period', value: period },
      { label: 'Orders', value: counted.length },
      { label: 'Cancelled orders', value: orders.length - counted.length },
      { label: 'Units sold', value: units },
      { label: 'Revenue', value: revenue },
      {
        label: 'Average order value',
        value: counted.length ? revenue / counted.length : 0,
      },
      { label: 'Delivery collected', value: counted.reduce((s, o) => s + o.shippingCost, 0) },
      { label: 'Discounts given', value: counted.reduce((s, o) => s + o.discount, 0) },
    ]);
    for (const row of [5, 6, 7, 8]) overview.getCell(`B${row + 1}`).numFmt = money;
    styleHeader(overview);

    // ----------------------------------------------------- a row per day
    const daily = workbook.addWorksheet('By day');
    daily.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Orders', key: 'orders', width: 10 },
      { header: 'Units', key: 'units', width: 10 },
      { header: 'Revenue', key: 'revenue', width: 16, style: { numFmt: money } },
    ];

    // Every day in the period, including the ones with nothing — a gap in a
    // sales sheet should read as a zero, not as a missing row.
    for (const day of eachDayOfInterval({ start, end })) {
      const key = format(day, 'yyyy-MM-dd');
      const sameDay = counted.filter((o) => format(o.createdAt, 'yyyy-MM-dd') === key);
      daily.addRow({
        date: key,
        orders: sameDay.length,
        units: sameDay.reduce((n, o) => n + o.items.reduce((m, i) => m + i.quantity, 0), 0),
        revenue: sameDay.reduce((s, o) => s + o.total, 0),
      });
    }
    styleHeader(daily);

    // -------------------------------------------------------- what sold
    const byProduct = new Map<string, { qty: number; revenue: number }>();
    for (const o of counted) {
      for (const i of o.items) {
        const row = byProduct.get(i.name) ?? { qty: 0, revenue: 0 };
        row.qty += i.quantity;
        row.revenue += i.unitPrice * i.quantity;
        byProduct.set(i.name, row);
      }
    }

    const products = workbook.addWorksheet('Products');
    products.columns = [
      { header: 'Product', key: 'name', width: 34 },
      { header: 'Units sold', key: 'qty', width: 12 },
      { header: 'Revenue', key: 'revenue', width: 16, style: { numFmt: money } },
      { header: 'Share of revenue', key: 'share', width: 18, style: { numFmt: '0.0%' } },
    ];
    for (const [name, v] of [...byProduct.entries()].sort((a, b) => b[1].revenue - a[1].revenue)) {
      products.addRow({
        name,
        qty: v.qty,
        revenue: v.revenue,
        share: revenue ? v.revenue / revenue : 0,
      });
    }
    styleHeader(products);

    // ------------------------------------------------- where it was going
    const byGovernorate = new Map<string, { orders: number; revenue: number }>();
    for (const o of counted) {
      const row = byGovernorate.get(o.governorate) ?? { orders: 0, revenue: 0 };
      row.orders += 1;
      row.revenue += o.total;
      byGovernorate.set(o.governorate, row);
    }

    const places = workbook.addWorksheet('Governorates');
    places.columns = [
      { header: 'Governorate', key: 'name', width: 24 },
      { header: 'Orders', key: 'orders', width: 10 },
      { header: 'Revenue', key: 'revenue', width: 16, style: { numFmt: money } },
    ];
    for (const [name, v] of [...byGovernorate.entries()].sort((a, b) => b[1].revenue - a[1].revenue)) {
      places.addRow({ name, orders: v.orders, revenue: v.revenue });
    }
    styleHeader(places);

    for (const sheet of [overview, daily, products, places]) {
      sheet.getColumn(1).border = { right: { style: 'hair', color: { argb: RULE } } };
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const slug = kind === 'orders' ? 'orders' : 'analytics';
  const filename = `luwjje-${slug}-${format(start, 'yyyy-MM-dd')}-to-${format(end, 'yyyy-MM-dd')}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.byteLength),
    },
  });
}
