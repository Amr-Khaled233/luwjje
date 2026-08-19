-- Idempotent, like the migrations before it: the build baselines a database
-- with no migration history and replays what follows, so a statement that has
-- already run must be a no-op rather than an abort.

-- AlterTable
ALTER TABLE "Governorate" DROP COLUMN IF EXISTS "freeOver";

-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN IF NOT EXISTS "fit" TEXT NOT NULL DEFAULT 'cover',
ADD COLUMN IF NOT EXISTS "focalX" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN IF NOT EXISTS "focalY" INTEGER NOT NULL DEFAULT 50;

-- CreateTable
CREATE TABLE IF NOT EXISTS "FreeShippingRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "nameAr" TEXT NOT NULL DEFAULT '',
    "minOrder" DOUBLE PRECISION,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FreeShippingRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FreeShippingRule_active_idx" ON "FreeShippingRule"("active");

-- Carry the old global threshold across as the first rule, so a store that had
-- "free over 2,000" keeps it instead of silently starting to charge everyone.
INSERT INTO "FreeShippingRule" ("id", "name", "nameAr", "minOrder", "active", "createdAt")
SELECT
  'seed-free-over-threshold',
  'Free delivery over the old threshold',
  'شحن مجاني فوق الحد السابق',
  s."freeShippingOver",
  true,
  CURRENT_TIMESTAMP
FROM "SiteSettings" s
WHERE EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'SiteSettings' AND column_name = 'freeShippingOver'
  )
  AND NOT EXISTS (SELECT 1 FROM "FreeShippingRule")
ON CONFLICT ("id") DO NOTHING;

-- AlterTable
ALTER TABLE "SiteSettings" DROP COLUMN IF EXISTS "freeShippingOver";
