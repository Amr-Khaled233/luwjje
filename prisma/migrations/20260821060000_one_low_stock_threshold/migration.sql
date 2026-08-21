-- "Running low" is one number for the whole shop now, not a threshold stored
-- per size that nobody was ever going to set nine of by hand.
ALTER TABLE "ProductVariant" DROP COLUMN IF EXISTS "lowStockAt";
