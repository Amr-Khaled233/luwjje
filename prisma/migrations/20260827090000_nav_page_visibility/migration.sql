-- About and Journal can now be hidden from the top nav and the footer, from
-- the settings page. Both default to shown, so nothing changes until toggled.
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "showAbout" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "showJournal" BOOLEAN NOT NULL DEFAULT true;
