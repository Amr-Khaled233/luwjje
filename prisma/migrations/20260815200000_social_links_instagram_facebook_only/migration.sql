-- AlterTable
ALTER TABLE "SiteSettings" DROP COLUMN "pinterestUrl",
DROP COLUMN "tiktokUrl",
DROP COLUMN "whatsappUrl";


-- Seed the store's two real channels where nothing has been set yet. Written
-- as a data step in the migration so the live site picks them up on deploy;
-- the WHERE clause makes it a no-op once someone edits them from Settings.
UPDATE "SiteSettings"
SET "instagramUrl" = 'https://www.instagram.com/luwjje'
WHERE "instagramUrl" = '';

UPDATE "SiteSettings"
SET "facebookUrl" = 'https://www.facebook.com/share/1BY898bngC/'
WHERE "facebookUrl" = '';
