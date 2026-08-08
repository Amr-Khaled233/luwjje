import Link from 'next/link';
import { NewsletterForm } from './newsletter-form';
import { getSettings, getFooterPages } from '@/lib/settings';

export async function SiteFooter() {
  const [settings, pages] = await Promise.all([getSettings(), getFooterPages()]);

  const socials = [
    { label: 'Instagram', url: settings.instagramUrl },
    { label: 'Pinterest', url: settings.pinterestUrl },
    { label: 'TikTok', url: settings.tiktokUrl },
    { label: 'Facebook', url: settings.facebookUrl },
  ].filter((s) => s.url);

  return (
    <footer className="mt-stack-lg border-t border-outline-variant bg-surface-low">
      <div className="container-luwjje grid grid-cols-1 gap-10 py-stack-md md:grid-cols-4 md:gap-gutter md:py-stack-lg">
        <div>
          <Link href="/" className="font-display text-[28px] leading-none">
            {settings.storeName}
          </Link>
          <p className="mt-4 max-w-[26ch] text-body-sm text-secondary">{settings.tagline}</p>
          <p className="mt-8 text-body-sm text-tertiary">
            © {new Date().getFullYear()} {settings.storeName}. All rights reserved.
          </p>
        </div>

        <div>
          <h3 className="label-caps mb-5 text-secondary">Customer Care</h3>
          <ul className="flex flex-col gap-3 text-body-sm">
            <li>
              <Link href="/orders" className="link-underline text-secondary hover:text-on-surface">
                Track an Order
              </Link>
            </li>
            <li>
              <a
                href={`mailto:${settings.supportEmail}`}
                className="link-underline text-secondary hover:text-on-surface"
              >
                Contact
              </a>
            </li>
            {pages.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/pages/${p.slug}`}
                  className="link-underline text-secondary hover:text-on-surface"
                >
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="label-caps mb-5 text-secondary">Social</h3>
          {socials.length ? (
            <ul className="flex flex-col gap-3 text-body-sm">
              {socials.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="link-underline text-secondary hover:text-on-surface"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body-sm text-tertiary">Coming soon.</p>
          )}
        </div>

        <div>
          <h3 className="label-caps mb-5 text-secondary">{settings.newsletterHeading}</h3>
          <p className="mb-5 text-body-sm text-secondary">{settings.newsletterBody}</p>
          <NewsletterForm />
        </div>
      </div>
    </footer>
  );
}
