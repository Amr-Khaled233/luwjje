-- The hero can now be shown as the image alone, without its text card, from
-- the offers page. Existing heroes keep their card (the default).
ALTER TABLE "Banner" ADD COLUMN IF NOT EXISTS "showText" BOOLEAN NOT NULL DEFAULT true;
