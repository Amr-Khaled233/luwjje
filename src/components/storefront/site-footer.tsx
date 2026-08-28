import Link from 'next/link';
import { LanguageSwitcher } from './language-switcher';
import { getSettings, getFooterPages } from '@/lib/settings';
import { getI18n } from '@/i18n/server';
import { pick } from '@/i18n/config';

export async function SiteFooter() {
  const [settings, pages, { locale, t }] = await Promise.all([
    getSettings(),
    getFooterPages(),
    getI18n(),
  ]);

  const socials = [
    { label: 'Instagram', url: settings.instagramUrl },
    { label: 'Facebook', url: settings.facebookUrl },
  ].filter((s) => s.url);

  // Owner-set headings and rights line fall back to the built-in wording when
  // left blank, so the footer always reads even before anything is edited.
  const careHeading =
    pick(locale, settings.footerLinksHeading, settings.footerLinksHeadingAr) || t.footer.customerCare;
  const socialHeading =
    pick(locale, settings.footerSocialHeading, settings.footerSocialHeadingAr) || t.footer.social;
  const rights = pick(locale, settings.footerRights, settings.footerRightsAr) || t.footer.rights;

  return (
    <footer className="mt-16 border-t border-outline-variant bg-surface-low md:mt-stack-lg">
      <div className="container-luwjje grid grid-cols-1 gap-8 py-10 sm:grid-cols-2 sm:gap-10 md:grid-cols-[1.5fr_1fr_1fr] md:gap-gutter md:py-stack-lg">
        <div>
          <Link href="/" className="font-latin text-[26px] font-medium leading-none transition-opacity hover:opacity-70 sm:text-[28px]">
            {settings.storeName}
          </Link>
          <p className="mt-4 max-w-[26ch] text-body-sm text-secondary">
            {pick(locale, settings.tagline, settings.taglineAr)}
          </p>
          <p className="mt-6 text-body-sm text-tertiary md:mt-8">
            © {new Date().getFullYear()} {settings.storeName}. {rights}
          </p>
          {settings.enableArabic && <LanguageSwitcher locale={locale} className="mt-4" />}
        </div>

        {settings.showFooterLinks && (
        <div>
          <h3 className="label-caps mb-4 text-secondary md:mb-5">{careHeading}</h3>
          <ul className="flex flex-col gap-3 text-body-sm">
            <li>
              <Link href="/orders" className="link-underline text-secondary hover:text-on-surface">
                {t.footer.trackOrder}
              </Link>
            </li>
            <li>
              <a
                href={`mailto:${settings.supportEmail}`}
                className="link-underline text-secondary hover:text-on-surface"
              >
                {t.footer.contact}
              </a>
            </li>
            {pages.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/pages/${p.slug}`}
                  className="link-underline text-secondary hover:text-on-surface"
                >
                  {pick(locale, p.title, p.titleAr)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        )}

        {settings.showFooterSocial && (
        <div>
          <h3 className="label-caps mb-4 text-secondary md:mb-5">{socialHeading}</h3>
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
            <p className="text-body-sm text-tertiary">{t.footer.comingSoon}</p>
          )}
        </div>
        )}

      </div>
    </footer>
  );
}
