-- Cash on delivery is the only way to pay, so "PAID" is not a stage an order
-- passes through: nothing is collected until the courier hands the parcel
-- over. Orders auto-marked paid at checkout were never actually paid, so they
-- go back to waiting.
UPDATE "Order" SET "status" = 'PENDING' WHERE "status" = 'PAID';

-- With one payment method there is nothing for a payment state to say, and no
-- provider to keep a reference for. IF EXISTS so a re-run finishes quietly.
ALTER TABLE "Order" DROP COLUMN IF EXISTS "paymentStatus";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "paymentRef";
