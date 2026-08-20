-- The shop no longer filters by colour, so neither the table of filterable
-- colours nor the switch that showed the control has anything to do.
-- IF EXISTS so a re-run after a partial apply completes rather than dying.
DROP TABLE IF EXISTS "FilterColor";
ALTER TABLE "SiteSettings" DROP COLUMN IF EXISTS "showColorFilter";
