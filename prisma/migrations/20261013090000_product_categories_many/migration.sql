-- A product can now belong to several categories at once (e.g. Men and Winter).
-- The join table is created and filled from each product's current category
-- BEFORE the old single-category column is dropped, so no assignment is lost.

-- 1. The many-to-many link table (Prisma's implicit layout: A = Category, B = Product).
CREATE TABLE IF NOT EXISTS "_CategoryToProduct" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "_CategoryToProduct_AB_unique" ON "_CategoryToProduct"("A", "B");
CREATE INDEX IF NOT EXISTS "_CategoryToProduct_B_index" ON "_CategoryToProduct"("B");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_CategoryToProduct_A_fkey') THEN
    ALTER TABLE "_CategoryToProduct" ADD CONSTRAINT "_CategoryToProduct_A_fkey"
      FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_CategoryToProduct_B_fkey') THEN
    ALTER TABLE "_CategoryToProduct" ADD CONSTRAINT "_CategoryToProduct_B_fkey"
      FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 2. Carry every existing assignment across.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'Product' AND column_name = 'categoryId') THEN
    INSERT INTO "_CategoryToProduct" ("A", "B")
    SELECT "categoryId", "id" FROM "Product" WHERE "categoryId" IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 3. Only now retire the single-category column.
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_categoryId_fkey";
DROP INDEX IF EXISTS "Product_categoryId_idx";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "categoryId";
