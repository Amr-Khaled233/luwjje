import { prisma } from './prisma';
import { sendMail } from './mailer';
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
      intro: 'شكراً لك. هذه تفاصيل طلبك، ونتواصل معك عند الشحن.',
      orderNumber: 'رقم الطلب',
      placed: 'تاريخ الطلب',
      items: 'القطع',
      qty: 'الكمية',
      subtotal: 'المجموع',
      shipping: 'الشحن',
      free: 'مجاني',
      discount: 'الخصم',
      total: 'الإجمالي',
      deliverTo: 'التوصيل إلى',
      notes: 'ملاحظات التوصيل',
      track: 'تتبّع طلبك',
      trackHint: 'يمكنك متابعة الطلب في أي وقت من صفحة تتبّع الطلبات بإدخال بريدك.',
      footer: 'إذا لم تطلب هذا، تجاهل الرسالة أو تواصل معنا.',
    };
  }
  return {
    subject: `${storeName} — order ${orderNumber} confirmed`,
    heading: 'We have your order',
    intro: 'Thank you. Here is what you ordered — we will be in touch when it ships.',
    orderNumber: 'Order number',
    placed: 'Placed',
    items: 'Items',
    qty: 'Qty',
    subtotal: 'Subtotal',
    shipping: 'Shipping',
    free: 'Free',
    discount: 'Discount',
    total: 'Total',
    deliverTo: 'Delivering to',
    notes: 'Delivery notes',
    track: 'Track your order',
    trackHint: 'You can check on it any time from the order tracking page using this email address.',
    footer: 'If you did not place this order, ignore this email or get in touch.',
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
        select: { storeName: true, currencySymbol: true, currencySymbolAr: true, supportEmail: true },
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
      `${t.deliverTo}: ${order.fullName}, ${address}`,
      order.notes ? `${t.notes}: ${order.notes}` : null,
      '',
      `${t.track}: ${trackUrl}`,
      '',
      t.footer,
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

    const html = `<!doctype html><html dir="${dir}"><body style="margin:0;background:#f8f9ff;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#0b1c30">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px">
    <p style="margin:0 0 32px;font-size:24px;font-weight:500;letter-spacing:-0.01em">${escapeHtml(storeName)}</p>

    <div style="border:1px solid #c4c7c9;background:#ffffff;padding:32px 28px">
      <h1 style="margin:0 0 12px;font-size:20px;font-weight:600">${escapeHtml(t.heading)}</h1>
      <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#565e74">${escapeHtml(t.intro)}</p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:28px">
        <tr>
          <td style="text-align:${align};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#747879;padding-bottom:4px">${escapeHtml(t.orderNumber)}</td>
          <td style="text-align:${locale === 'ar' ? 'left' : 'right'};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#747879;padding-bottom:4px">${escapeHtml(t.placed)}</td>
        </tr>
        <tr>
          <td style="text-align:${align};font-size:15px" dir="ltr">${escapeHtml(order.orderNumber)}</td>
          <td style="text-align:${locale === 'ar' ? 'left' : 'right'};font-size:15px">${escapeHtml(placed)}</td>
        </tr>
      </table>

      <table style="width:100%;border-collapse:collapse">
        ${rows}
        ${totalRow(t.subtotal, money(order.subtotal))}
        ${totalRow(t.shipping, order.shippingCost === 0 ? t.free : money(order.shippingCost))}
        ${order.discount > 0 ? totalRow(t.discount, `−${money(order.discount)}`) : ''}
        ${totalRow(t.total, money(order.total), true)}
      </table>

      <div style="margin-top:28px;padding-top:24px;border-top:1px solid #e5eeff">
        <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#747879">${escapeHtml(t.deliverTo)}</p>
        <p style="margin:0;font-size:15px;line-height:1.6">${escapeHtml(order.fullName)}<br>${escapeHtml(address)}${order.phone ? `<br><span dir="ltr">${escapeHtml(order.phone)}</span>` : ''}</p>
        ${
          order.notes
            ? `<p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#747879">${escapeHtml(t.notes)}: ${escapeHtml(order.notes)}</p>`
            : ''
        }
      </div>

      <a href="${trackUrl}" style="display:inline-block;margin-top:28px;background:#0b1c30;color:#f8f9ff;text-decoration:none;padding:14px 28px;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase">${escapeHtml(t.track)}</a>
      <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#747879">${escapeHtml(t.trackHint)}</p>
    </div>

    <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#747879">${escapeHtml(t.footer)}${
      settings?.supportEmail ? ` — ${escapeHtml(settings.supportEmail)}` : ''
    }</p>
  </div>
</body></html>`;

    return { to: order.email, subject: t.subject, text, html };
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
