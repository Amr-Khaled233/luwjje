-- AlterTable
-- IF EXISTS so a re-run after a partial apply completes instead of dying.
ALTER TABLE "Banner" DROP COLUMN IF EXISTS "ctaHref";

