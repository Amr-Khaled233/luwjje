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

console.log('\n▸ Excel export');
const xlsx = await fetch(`${BASE}/api/dashboard/report?days=30`, { headers: EN });
const type = xlsx.headers.get('content-type') ?? '';
const disp = xlsx.headers.get('content-disposition') ?? '';
check('returns 200', xlsx.status === 200, xlsx.status);
check('is a spreadsheet MIME type', type.includes('spreadsheetml.sheet'), type);
check('filename ends in .xlsx', disp.includes('.xlsx'), disp);

const buf = Buffer.from(await xlsx.arrayBuffer());
// A .xlsx is a zip: it must start with the PK signature.
check('body is a real zip/xlsx container', buf[0] === 0x50 && buf[1] === 0x4b, buf.subarray(0, 4));
check('file is non-trivial', buf.byteLength > 2000, `${buf.byteLength} bytes`);

const { default: ExcelJS } = await import('exceljs');
const wb = new ExcelJS.Workbook();
await wb.xlsx.load(buf);
check('has an Orders sheet', Boolean(wb.getWorksheet('Orders')));
check('has a Product sales sheet', Boolean(wb.getWorksheet('Product sales')));
check(
  'Orders sheet has the expected header',
  wb.getWorksheet('Orders')?.getRow(1).getCell(1).value === 'Order',
  wb.getWorksheet('Orders')?.getRow(1).getCell(1).value,
);
check('report rejects without a session', (await fetch(`${BASE}/api/dashboard/report`)).status === 401);

console.log(`\n${fail === 0 ? '✓' : '✗'} ${pass} passed, ${fail} failed\n`);
process.exitCode = fail ? 1 : 0;
