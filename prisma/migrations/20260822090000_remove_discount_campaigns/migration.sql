-- Automatic discount campaigns are gone: the only place to create them was the
-- offers page, which no longer offers them. Per-product "price before discount"
-- (compareAtPrice) and promo codes cover the same ground. Drop the child table
-- first so the foreign key does not block the parent.
DROP TABLE IF EXISTS "DiscountProduct";
DROP TABLE IF EXISTS "Discount";
