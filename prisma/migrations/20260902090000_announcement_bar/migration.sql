-- Announcement strip above the header, controlled from Settings.
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "showAnnouncement" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "announcementText" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "announcementTextAr" TEXT NOT NULL DEFAULT '';
