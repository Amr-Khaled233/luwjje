/**
 * Verifies the dashboard: Arabic/RTL, the removed Overview and Traffic
 * Sources, grid tables, the checkbox tick, and the Excel export (opened and
 * read back, not just content-type sniffed).
 *
 *   npm run build && npm start
 *   npm run dash
 */
import './load-env.ts';
import { COOKIE_NAME, staffCookie } from './session.mjs';

const BASE = process.env.DASH_BASE ?? 'http://localhost:3000';
const cookie = await staffCookie();
const token = cookie.split('=').slice(1).join('=');
const EN = { cookie: `${COOKIE_NAME}=${token}; luwjje_locale=en` };
const AR = { cookie: `${COOKIE_NAME}=${token}; luwjje_locale=ar` };

let pass = 0, fail = 0;
const check = (l, ok, d) => {
  if (ok) { pass++; console.log(`  ✓ ${l}`); }
  else { fail++; console.log(`  ✗ ${l}${d !== undefined ? ` — ${String(d).slice(0, 160)}` : ''}`); }
};
const SCRIPTS = new RegExp('<script[\\s\\S]*?</script>', 'g');
const raw = (p, h) => fetch(`${BASE}${p}`, { headers: h, redirect: 'manual' });
const html = async (p, h) => (await (await fetch(`${BASE}${p}`, { headers: h })).text()).replace(SCRIPTS, '');

console.log('\n▸ Dashboard tab removed');
const root = await raw('/dashboard', EN);
check('/dashboard redirects', root.status === 307, root.status);
check('…to Orders', (root.headers.get('location') ?? '').includes('/dashboard/orders'),
  root.headers.get('location'));

const orders = await html('/dashboard/orders', EN);
check('sidebar has no Dashboard link', !/>Dashboard</.test(orders));
check('sidebar starts with Orders', orders.includes('>Orders<'));

console.log('\n▸ Traffic Sources removed');
const analytics = await html('/dashboard/analytics', EN);
check('no Traffic Sources card', !analytics.includes('Traffic Sources'));
check('Top Products still there', analytics.includes('Top Products'));
check('Orders by status still there', analytics.includes('Orders by status'));

console.log('\n▸ Arabic dashboard');
const ordersAr = await html('/dashboard/orders', AR);
check('page renders RTL', ordersAr.includes('dir="rtl"'));
check('nav translated', ordersAr.includes('المنتجات') && ordersAr.includes('المخزون'));
check('page title translated', ordersAr.includes('الطلبات'));
check('logout translated', ordersAr.includes('تسجيل الخروج'));
check('subtitle translated', ordersAr.includes('لوحة الإدارة'));
for (const [path, word] of [
  ['/dashboard/products', 'المنتجات'],
  ['/dashboard/categories', 'الفئات'],
  ['/dashboard/stock', 'المخزون'],
  ['/dashboard/shipping', 'الشحن'],
  ['/dashboard/filters', 'فلاتر المتجر'],
  ['/dashboard/promo-codes', 'أكواد الخصم'],
  ['/dashboard/analytics', 'الإحصائيات'],
  ['/dashboard/settings', 'الإعدادات'],
]) {
  check(`${path} title in Arabic`, (await html(path, AR)).includes(word));
}
check('English still English', (await html('/dashboard/products', EN)).includes('Products'));

console.log('\n▸ Grid tables');
const shipping = await html('/dashboard/shipping', EN);
check('cells carry vertical rules', /border-e/.test(shipping), 'no border-e class found');
check('header row is tinted', /bg-surface-low/.test(shipping));

console.log('\n▸ Checkbox renders a tick');
check('a check icon sits next to each box', /peer-checked:opacity-100/.test(shipping));
check('no broken background-image class', !/checked:bg-\[url/.test(shipping));

console.log('\n▸ Excel exports');
const { default: ExcelJS } = await import('exceljs');

/** Fetches a workbook and opens it, so the checks read the real file. */
async function workbook(query) {
  const res = await fetch(`${BASE}/api/dashboard/report?${query}`, { headers: EN });
  const buf = Buffer.from(await res.arrayBuffer());
  const wb = new ExcelJS.Workbook();
  if (buf[0] === 0x50 && buf[1] === 0x4b) await wb.xlsx.load(buf);
  return {
    status: res.status,
    type: res.headers.get('content-type') ?? '',
    disposition: res.headers.get('content-disposition') ?? '',
    bytes: buf.byteLength,
    isZip: buf[0] === 0x50 && buf[1] === 0x4b,
    sheets: wb.worksheets.map((s) => s.name),
    wb,
  };
}

// ------------------------------------------------------ the analytics file
const summary = await workbook('report=summary&days=30');
check('analytics export returns 200', summary.status === 200, summary.status);
check('is a spreadsheet MIME type', summary.type.includes('spreadsheetml.sheet'), summary.type);
check('filename ends in .xlsx', summary.disposition.includes('.xlsx'), summary.disposition);
check('body is a real zip/xlsx container', summary.isZip);
check('file is non-trivial', summary.bytes > 2000, `${summary.bytes} bytes`);
check('has a Summary sheet', summary.sheets.includes('Summary'), summary.sheets.join(', '));
check('has a day-by-day sheet', summary.sheets.includes('By day'));
check('has a Products sheet', summary.sheets.includes('Products'));
check('has a Governorates sheet', summary.sheets.includes('Governorates'));
check(
  'the day sheet covers every day of the period',
  summary.wb.getWorksheet('By day').rowCount === 31,
  summary.wb.getWorksheet('By day').rowCount,
);

// --------------------------------------------------------- the orders file
const orderBook = await workbook('report=orders&days=30');
check('orders export returns 200', orderBook.status === 200, orderBook.status);
check('has an Orders sheet', orderBook.sheets.includes('Orders'), orderBook.sheets.join(', '));
check('and only that sheet', orderBook.sheets.length === 1, orderBook.sheets.join(', '));
check(
  'Orders sheet has the expected header',
  orderBook.wb.getWorksheet('Orders')?.getRow(1).getCell(1).value === 'Order',
  orderBook.wb.getWorksheet('Orders')?.getRow(1).getCell(1).value,
);

// ------------------------------------------------------- a period of choice
const custom = await workbook('report=orders&from=2026-01-05&to=2026-01-19');
check(
  'a custom period names itself in the filename',
  custom.disposition.includes('2026-01-05-to-2026-01-19'),
  custom.disposition,
);
const backwards = await workbook('report=orders&from=2026-01-19&to=2026-01-05');
check(
  'a backwards period is corrected rather than returning nothing',
  backwards.disposition.includes('2026-01-05-to-2026-01-19'),
  backwards.disposition,
);
const nonsense = await workbook('report=orders&from=not-a-date&to=nope');
check('an unparseable period falls back to the default', nonsense.status === 200, nonsense.status);

check('report rejects without a session', (await fetch(`${BASE}/api/dashboard/report`)).status === 401);

console.log(`\n${fail === 0 ? '✓' : '✗'} ${pass} passed, ${fail} failed\n`);
process.exitCode = fail ? 1 : 0;
