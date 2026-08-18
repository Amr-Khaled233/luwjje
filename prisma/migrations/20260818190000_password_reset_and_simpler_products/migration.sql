-- AlterTable
ALTER TABLE "Product" DROP COLUMN IF EXISTS "careInfo",
DROP COLUMN IF EXISTS "careInfoAr",
DROP COLUMN IF EXISTS "materialInfo",
DROP COLUMN IF EXISTS "materialInfoAr";

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "sessionEpoch" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_tokenHash_key" ON "PasswordReset"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordReset_expiresAt_idx" ON "PasswordReset"("expiresAt");

