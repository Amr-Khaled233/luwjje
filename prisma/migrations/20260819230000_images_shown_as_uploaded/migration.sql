-- Product photos are shown exactly as uploaded, at their own shape, so there
-- is no fixed frame left to crop against or position within.
-- IF EXISTS so a re-run after a partial apply completes rather than dying.
ALTER TABLE "ProductImage" DROP COLUMN IF EXISTS "focalX";
ALTER TABLE "ProductImage" DROP COLUMN IF EXISTS "focalY";
ALTER TABLE "ProductImage" DROP COLUMN IF EXISTS "fit";
ALTER TABLE "ProductImage" DROP COLUMN IF EXISTS "width";
ALTER TABLE "ProductImage" DROP COLUMN IF EXISTS "height";
