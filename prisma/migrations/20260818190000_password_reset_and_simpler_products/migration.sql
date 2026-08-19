-- Every statement here is idempotent on purpose.
--
-- The build baselines a database that has tables but no migration history, and
-- then replays the migrations that follow. If any of them has already been
-- applied by hand, a plain ADD COLUMN or CREATE TABLE aborts the run and
-- Prisma records the migration as failed, which blocks every later deploy
-- until someone resolves it by hand.

-- AlterTable
ALTER TABLE "Product" DROP COLUMN IF EXISTS "careInfo",
DROP COLUMN IF EXISTS "careInfoAr",
DROP COLUMN IF EXISTS "materialInfo",
DROP COLUMN IF EXISTS "materialInfoAr";

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "sessionEpoch" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PasswordReset" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PasswordReset_tokenHash_key" ON "PasswordReset"("tokenHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PasswordReset_expiresAt_idx" ON "PasswordReset"("expiresAt");
