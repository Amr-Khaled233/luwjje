-- The footer no longer offers a newsletter, so the sign-up endpoint, the list
-- of subscribers and the copy that introduced it have nothing left to do.
-- IF EXISTS so a re-run after a partial apply completes rather than dying.
DROP TABLE IF EXISTS "NewsletterSubscriber";
ALTER TABLE "SiteSettings" DROP COLUMN IF EXISTS "newsletterHeading";
ALTER TABLE "SiteSettings" DROP COLUMN IF EXISTS "newsletterHeadingAr";
ALTER TABLE "SiteSettings" DROP COLUMN IF EXISTS "newsletterBody";
ALTER TABLE "SiteSettings" DROP COLUMN IF EXISTS "newsletterBodyAr";
