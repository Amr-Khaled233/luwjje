-- AlterTable
-- IF NOT EXISTS so a re-run after a partial apply completes rather than dying.
ALTER TABLE "ProductImage" ADD COLUMN IF NOT EXISTS "width" INTEGER;
ALTER TABLE "ProductImage" ADD COLUMN IF NOT EXISTS "height" INTEGER;
