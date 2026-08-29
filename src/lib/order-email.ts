import { prisma } from './prisma';
import { sendMail, notificationAddress } from './mailer';
import { formatPrice } from './utils';
import { pick, type Locale } from '@/i18n/config';

/**
 * The order confirmation a shopper receives.
 *
 * Written as its own module rather than pulled from the UI dictionaries: an
 * email is read outside the app, weeks later, in a client that will ignore
 * most of the CSS. It gets copy and markup suited to that, not to the site.
 *
 * Sending is deliberately unable to fail an order. By the time this runs the
 * order is committed and the stock is decremented; a mail provider having a
 * bad minute must not turn that into an error the shopper sees.
 */

/** Longer than this and the shopper is staring at a spinner for no reason. */
const SEND_TIMEOUT_MS = 6000;

function baseUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '')) || 'http://localhost:3000';
}

function copy(locale: Locale, storeName: string, orderNumber: string) {
  if (locale === 'ar') {
    return {
      subject: `${storeName} — تأكيد طلبك ${orderNumber}`,
      heading: 'تم استلام طلبك',
      intro: 'شكراً لك. هذه تفاصيل طلبك.',
      orderNumber: 'رقم الطلب',
      placed: 'تاريخ الطلب',
      items: 'القطع',
      qty: 'الكمية',
      subtotal: 'المجموع',
      shipping: 'الشحن',
      free: 'مجاني',
      discount: 'الخصم',
      total: 'الإجمالي',
      payment: 'طريقة الدفع',
      cashOnDelivery: 'الدفع عند الاستلام',
      deliverTo: 'التوصيل إلى',
      notes: 'ملاحظات التوصيل',
      track: 'تتبّع طلبك',
      trackTitle: 'تابع طلبك في أي وقت',
      trackHint: 'ادخل على صفحة تتبّع الطلبات في الموقع واكتب بريدك الإلكتروني.',
      questions: 'لأي استفسار',
    };
  }
  return {
    subject: `${storeName} — order ${orderNumber} confirmed`,
    heading: 'We have your order',
    intro: 'Thank you. Here is what you ordered.',
    orderNumber: 'Order number',
    placed: 'Placed',
    items: 'Items',
    qty: 'Qty',
    subtotal: 'Subtotal',
    shipping: 'Shipping',
    free: 'Free',
    discount: 'Discount',
    total: 'Total',
    payment: 'Payment',
    cashOnDelivery: 'Cash on delivery',
    deliverTo: 'Delivering to',
    notes: 'Delivery notes',
    track: 'Track your order',
    trackTitle: 'Follow your order any time',
    trackHint: 'Go to the order tracking page on the site and enter your email address.',
    questions: 'Any questions',
  };
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Renders the confirmation without sending it. Separate from the send so the
 * markup can be inspected directly — the console transport only prints the
 * plain-text part, which would leave the HTML escaping untested.
 */
export async function buildOrderEmail(
  orderNumber: string,
  locale: Locale = 'en',
): Promise<{ to: string; subject: string; text: string; html: string } | null> {
  {
    const [order, settings] = await Promise.all([
      prisma.order.findUnique({ where: { orderNumber }, include: { items: true } }),
      prisma.siteSettings.findUnique({
        where: { id: 'singleton' },
        select: {
          storeName: true,
          logoUrl: true,
          currencySymbol: true,
          currencySymbolAr: true,
          supportEmail: true,
          supportPhone: true,
        },
      }),
    ]);

    if (!order) return null;

    const storeName = settings?.storeName ?? 'luwjje';
    const symbol =
      (locale === 'ar' ? settings?.currencySymbolAr : settings?.currencySymbol) || 'EGP';
    const t = copy(locale, storeName, order.orderNumber);
    const money = (value: number) => formatPrice(value, symbol, locale);
    const dir = locale === 'ar' ? 'rtl' : 'ltr';
    const align = locale === 'ar' ? 'right' : 'left';
    const trackUrl = `${baseUrl()}/orders`;

    const placed = order.createdAt.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const address = [order.street, order.area, order.governorate].filter(Boolean).join('، ');

    // ---------------------------------------------------------------- text
    const lines = order.items.map((item) => {
      const name = pick(locale, item.name, item.nameAr);
      const detail = [item.colorName, item.size].filter(Boolean).join(' · ');
      return `  ${name}${detail ? ` (${detail})` : ''} × ${item.quantity} — ${money(
        item.unitPrice * item.quantity,
      )}`;
    });

    const text = [
      `${t.heading}`,
      '',
      t.intro,
      '',
      `${t.orderNumber}: ${order.orderNumber}`,
      `${t.placed}: ${placed}`,
      '',
      `${t.items}:`,
      ...lines,
      '',
      `${t.subtotal}: ${money(order.subtotal)}`,
      `${t.shipping}: ${order.shippingCost === 0 ? t.free : money(order.shippingCost)}`,
      order.discount > 0 ? `${t.discount}: −${money(order.discount)}` : null,
      `${t.total}: ${money(order.total)}`,
      '',
      `${t.payment}: ${t.cashOnDelivery}`,
      '',
      `${t.deliverTo}: ${order.fullName}, ${address}`,
      order.notes ? `${t.notes}: ${order.notes}` : null,
      '',
      `${t.trackTitle}`,
      t.trackHint,
      trackUrl,
      '',
      settings?.supportEmail ? `${t.questions}: ${settings.supportEmail}` : null,
    ]
      .filter((line) => line !== null)
      .join('\n');

    // ---------------------------------------------------------------- html
    const rows = order.items
      .map((item) => {
        const name = escapeHtml(pick(locale, item.name, item.nameAr));
        const detail = escapeHtml([item.colorName, item.size].filter(Boolean).join(' · '));
        return `<tr>
        <td style="padding:12px 0;border-bottom:1px solid #e5eeff;text-align:${align}">
          <span style="display:block;font-size:15px;color:#0b1c30">${name}</span>
          ${detail ? `<span style="display:block;margin-top:3px;font-size:13px;color:#747879">${detail}</span>` : ''}
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #e5eeff;text-align:center;font-size:14px;color:#565e74;white-space:nowrap">×${item.quantity}</td>
        <td style="padding:12px 0;border-bottom:1px solid #e5eeff;text-align:${locale === 'ar' ? 'left' : 'right'};font-size:14px;color:#0b1c30;white-space:nowrap">${escapeHtml(money(item.unitPrice * item.quantity))}</td>
      </tr>`;
      })
      .join('');

    const totalRow = (label: string, value: string, strong = false) => `<tr>
      <td colspan="2" style="padding:${strong ? '14px 0 0' : '6px 0 0'};text-align:${align};font-size:${strong ? '15px' : '14px'};color:${strong ? '#0b1c30' : '#565e74'};${strong ? 'font-weight:600;border-top:1px solid #c4c7c9' : ''}">${escapeHtml(label)}</td>
      <td style="padding:${strong ? '14px 0 0' : '6px 0 0'};text-align:${locale === 'ar' ? 'left' : 'right'};font-size:${strong ? '15px' : '14px'};color:${strong ? '#0b1c30' : '#565e74'};${strong ? 'font-weight:600;border-top:1px solid #c4c7c9' : ''};white-space:nowrap">${escapeHtml(value)}</td>
    </tr>`;

    // The masthead is the logo when one is set, and the store name otherwise.
    // A remote image is the one thing a mail client may refuse to load, so the
    // name is always present underneath it as the fallback identity.
    const masthead = settings?.logoUrl
      ? `<img src="${escapeHtml(settings.logoUrl)}" alt="${escapeHtml(storeName)}" width="132" style="display:block;margin:0 auto 10px;max-width:132px;height:auto;border:0">`
      : '';

    const html = `<!doctype html>
<html dir="${dir}" lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(t.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f8f9ff;-webkit-font-smoothing:antialiased">
  <!-- Preheader: the line inboxes show beside the subject. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(t.intro)}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9ff">
    <tr>
      <td align="center" style="padding:40px 16px">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#0b1c30">

          <!-- masthead -->
          <tr>
            <td align="center" style="padding:0 0 28px">
              ${masthead}
              <div style="font-size:26px;font-weight:500;letter-spacing:-0.01em;color:#0b1c30">${escapeHtml(storeName)}</div>
            </td>
          </tr>

          <!-- confirmation -->
          <tr>
            <td style="background:#ffffff;border:1px solid #c4c7c9;padding:32px 28px">
              <div style="text-align:${align}">
                <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#747879;margin-bottom:10px">${escapeHtml(t.orderNumber)} <span dir="ltr">${escapeHtml(order.orderNumber)}</span></div>
                <h1 style="margin:0 0 10px;font-size:22px;font-weight:600;line-height:1.3">${escapeHtml(t.heading)}</h1>
                <p style="margin:0 0 26px;font-size:15px;line-height:1.65;color:#565e74">${escapeHtml(t.intro)}</p>
              </div>

              <!-- items -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
                <tr>
                  <td colspan="3" style="padding:0 0 6px;text-align:${align};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#747879;border-bottom:1px solid #0b1c30">${escapeHtml(t.items)}</td>
                </tr>
                ${rows}
                ${totalRow(t.subtotal, money(order.subtotal))}
                ${totalRow(t.shipping, order.shippingCost === 0 ? t.free : money(order.shippingCost))}
                ${order.discount > 0 ? totalRow(t.discount, `−${money(order.discount)}`) : ''}
                ${totalRow(t.total, money(order.total), true)}
              </table>

              <!-- delivery -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;border-top:1px solid #e5eeff">
                <tr>
                  <td style="padding:22px 0 0;text-align:${align}">
                    <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#747879;margin-bottom:6px">${escapeHtml(t.deliverTo)}</div>
                    <div style="font-size:15px;line-height:1.7;color:#0b1c30">
                      ${escapeHtml(order.fullName)}<br>${escapeHtml(address)}
                      ${order.phone ? `<br><span dir="ltr">${escapeHtml(order.phone)}</span>` : ''}
                    </div>
                    ${order.notes ? `<div style="margin-top:14px;font-size:13px;line-height:1.6;color:#747879">${escapeHtml(t.notes)}: ${escapeHtml(order.notes)}</div>` : ''}
                    <div style="margin-top:18px;padding-top:18px;border-top:1px solid #e5eeff">
                      <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#747879;margin-bottom:6px">${escapeHtml(t.payment)}</div>
                      <div style="font-size:15px;line-height:1.7;color:#0b1c30">${escapeHtml(t.cashOnDelivery)}</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- tracking: how to check on it later, without an account -->
          <tr>
            <td style="background:#eff4ff;border:1px solid #c4c7c9;border-top:0;padding:28px;text-align:${align}">
              <h2 style="margin:0 0 8px;font-size:16px;font-weight:600">${escapeHtml(t.trackTitle)}</h2>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.65;color:#565e74">${escapeHtml(t.trackHint)}</p>
              <a href="${trackUrl}" style="display:inline-block;background:#0b1c30;color:#f8f9ff;text-decoration:none;padding:14px 30px;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase">${escapeHtml(t.track)}</a>
              <div style="margin-top:14px;font-size:12px;color:#747879;word-break:break-all"><a href="${trackUrl}" style="color:#747879">${trackUrl}</a></div>
            </td>
          </tr>

          <!-- footer -->
          <tr>
            <td style="padding:24px 4px 0;text-align:${align}">
              ${settings?.supportEmail ? `<div style="font-size:13px;line-height:1.7;color:#565e74">${escapeHtml(t.questions)}: <a href="mailto:${escapeHtml(settings.supportEmail)}" style="color:#0b1c30">${escapeHtml(settings.supportEmail)}</a>${settings.supportPhone ? ` · <span dir="ltr">${escapeHtml(settings.supportPhone)}</span>` : ''}</div>` : ''}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body></html>`;
    return { to: order.email, subject: t.subject, text, html };
  }
}

/**
 * The "you have a new order" alert the owner receives — separate from the
 * shopper's confirmation, and written for whoever runs the shop: the customer's
 * details, what they ordered, what to collect, and a link straight to the order
 * in the dashboard. In the store's own language.
 */
export async function buildOwnerNotification(
  orderNumber: string,
): Promise<{ to: string; subject: string; text: string; html: string } | null> {
  const [order, settings] = await Promise.all([
    prisma.order.findUnique({ where: { orderNumber }, include: { items: true } }),
    prisma.siteSettings.findUnique({
      where: { id: 'singleton' },
      select: {
        storeName: true,
        currencySymbol: true,
        currencySymbolAr: true,
        supportEmail: true,
        defaultLocale: true,
      },
    }),
  ]);

  if (!order) return null;

  const to = notificationAddress() || settings?.supportEmail || '';
  if (!to) return null; // nowhere to send it — the shop has set no owner address

  const locale: Locale = settings?.defaultLocale === 'ar' ? 'ar' : 'en';
  const storeName = settings?.storeName ?? 'luwjje';
  const symbol = (locale === 'ar' ? settings?.currencySymbolAr : settings?.currencySymbol) || 'EGP';
  const money = (v: number) => formatPrice(v, symbol, locale);
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const align = locale === 'ar' ? 'right' : 'left';
  const dashUrl = `${baseUrl()}/dashboard/orders`;

  const c =
    locale === 'ar'
      ? {
          subject: `طلب جديد ${order.orderNumber} · ${money(order.total)}`,
          heading: 'طلب جديد',
          intro: `وصل طلب جديد على ${storeName}.`,
          orderNumber: 'رقم الطلب',
          customer: 'العميل',
          phone: 'الموبايل',
          email: 'البريد',
          deliverTo: 'التوصيل إلى',
          items: 'الطلب',
          total: 'الإجمالي',
          payment: 'الدفع: عند الاستلام',
          open: 'افتح الطلب في اللوحة',
        }
      : {
          subject: `New order ${order.orderNumber} · ${money(order.total)}`,
          heading: 'New order',
          intro: `A new order came in on ${storeName}.`,
          orderNumber: 'Order number',
          customer: 'Customer',
          phone: 'Phone',
          email: 'Email',
          deliverTo: 'Delivering to',
          items: 'Items',
          total: 'Total',
          payment: 'Payment: cash on delivery',
          open: 'Open the order in the dashboard',
        };

  const address = [order.street, order.area, order.governorate].filter(Boolean).join('، ');
  const itemLines = order.items.map(
    (i) =>
      `  ${pick(locale, i.name, i.nameAr)}${[i.colorName, i.size].filter(Boolean).length ? ` (${[i.colorName, i.size].filter(Boolean).join(' · ')})` : ''} × ${i.quantity} — ${money(i.unitPrice * i.quantity)}`,
  );

  const text = [
    c.heading,
    '',
    c.intro,
    '',
    `${c.orderNumber}: ${order.orderNumber}`,
    `${c.customer}: ${order.fullName}`,
    order.phone ? `${c.phone}: ${order.phone}` : null,
    `${c.email}: ${order.email}`,
    `${c.deliverTo}: ${address}`,
    '',
    `${c.items}:`,
    ...itemLines,
    '',
    `${c.total}: ${money(order.total)}`,
    c.payment,
    '',
    c.open,
    dashUrl,
  ]
    .filter((l) => l !== null)
    .join('\n');

  const rows = order.items
    .map((i) => {
      const detail = escapeHtml([i.colorName, i.size].filter(Boolean).join(' · '));
      return `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #e5eeff;text-align:${align};font-size:14px;color:#0b1c30">${escapeHtml(pick(locale, i.name, i.nameAr))}${detail ? `<br><span style="font-size:12px;color:#747879">${detail}</span>` : ''}</td>
        <td style="padding:8px 0;border-bottom:1px solid #e5eeff;text-align:center;font-size:14px;color:#565e74;white-space:nowrap">×${i.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #e5eeff;text-align:${locale === 'ar' ? 'left' : 'right'};font-size:14px;color:#0b1c30;white-space:nowrap">${escapeHtml(money(i.unitPrice * i.quantity))}</td>
      </tr>`;
    })
    .join('');

  const line = (label: string, value: string) =>
    `<tr><td style="padding:2px 0;text-align:${align};font-size:13px;color:#747879">${escapeHtml(label)}</td><td style="padding:2px 0;text-align:${locale === 'ar' ? 'left' : 'right'};font-size:13px;color:#0b1c30">${escapeHtml(value)}</td></tr>`;

  const html = `<!doctype html><html dir="${dir}" lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f9ff;-webkit-font-smoothing:antialiased">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9ff"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#0b1c30">
      <tr><td style="background:#0b1c30;color:#f8f9ff;padding:20px 24px;text-align:${align}">
        <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;opacity:0.75">${escapeHtml(storeName)}</div>
        <div style="font-size:20px;font-weight:600;margin-top:4px">${escapeHtml(c.heading)} · <span dir="ltr">${escapeHtml(order.orderNumber)}</span></div>
      </td></tr>
      <tr><td style="background:#ffffff;border:1px solid #c4c7c9;border-top:0;padding:24px">
        <p style="margin:0 0 20px;font-size:15px;color:#565e74;text-align:${align}">${escapeHtml(c.intro)}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px">
          ${line(c.customer, order.fullName)}
          ${order.phone ? line(c.phone, order.phone) : ''}
          ${line(c.email, order.email)}
          ${line(c.deliverTo, address)}
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
          <tr><td colspan="3" style="padding:0 0 6px;text-align:${align};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#747879;border-bottom:1px solid #0b1c30">${escapeHtml(c.items)}</td></tr>
          ${rows}
          <tr><td colspan="2" style="padding:12px 0 0;text-align:${align};font-size:15px;font-weight:600;border-top:1px solid #c4c7c9">${escapeHtml(c.total)}</td><td style="padding:12px 0 0;text-align:${locale === 'ar' ? 'left' : 'right'};font-size:15px;font-weight:600;border-top:1px solid #c4c7c9;white-space:nowrap">${escapeHtml(money(order.total))}</td></tr>
        </table>
        <p style="margin:16px 0 24px;font-size:13px;color:#565e74;text-align:${align}">${escapeHtml(c.payment)}</p>
        <a href="${dashUrl}" style="display:inline-block;background:#0b1c30;color:#f8f9ff;text-decoration:none;padding:13px 26px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase">${escapeHtml(c.open)}</a>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  return { to, subject: c.subject, text, html };
}

/** Emails the owner that an order came in. Never throws. */
export async function sendOrderNotification(orderNumber: string) {
  try {
    const message = await buildOwnerNotification(orderNumber);
    if (!message) return false;

    const result = await Promise.race([
      sendMail(message),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), SEND_TIMEOUT_MS)),
    ]);

    if (result === null) {
      console.warn(`order ${orderNumber}: owner notification timed out`);
      return false;
    }
    return result.ok;
  } catch (error) {
    console.error(`order ${orderNumber}: owner notification failed`, error);
    return false;
  }
}

/**
 * Sends the confirmation for an order that has already been written.
 * Returns whether it went out; never throws.
 */
export async function sendOrderConfirmation(orderNumber: string, locale: Locale = 'en') {
  try {
    const message = await buildOrderEmail(orderNumber, locale);
    if (!message) return false;

    // A slow provider must not hold the shopper on the checkout button.
    const result = await Promise.race([
      sendMail(message),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), SEND_TIMEOUT_MS)),
    ]);

    if (result === null) {
      console.warn(`order ${orderNumber}: confirmation email timed out`);
      return false;
    }
    return result.ok;
  } catch (error) {
    console.error(`order ${orderNumber}: confirmation email failed`, error);
    return false;
  }
}
