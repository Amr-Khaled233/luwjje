-- The footer's two link columns can be hidden, their headings and the rights
-- line overridden. Blank strings fall back to the built-in wording, and both
-- columns default to shown, so nothing changes until edited.
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "showFooterLinks" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "showFooterSocial" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "footerLinksHeading" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "footerLinksHeadingAr" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "footerSocialHeading" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "footerSocialHeadingAr" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "footerRights" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "footerRightsAr" TEXT NOT NULL DEFAULT '';
