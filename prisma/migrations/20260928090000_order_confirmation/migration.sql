-- Orders now require the shopper to confirm by email before they count.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "confirmed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "confirmationToken" TEXT;

-- Every order that already exists predates confirmation, so it stays visible.
UPDATE "Order"
   SET "confirmed" = true, "confirmedAt" = "createdAt"
 WHERE "confirmationToken" IS NULL AND "confirmed" = false;

CREATE UNIQUE INDEX IF NOT EXISTS "Order_confirmationToken_key" ON "Order"("confirmationToken");
CREATE INDEX IF NOT EXISTS "Order_confirmed_idx" ON "Order"("confirmed");

-- The store's own contact address.
UPDATE "SiteSettings" SET "supportEmail" = 'luwjjesupport@gmail.com' WHERE id = 'singleton';
