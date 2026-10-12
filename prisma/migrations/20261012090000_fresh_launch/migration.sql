-- Launch on luwjje.com. Clear the starter template's placeholder copy from the
-- live store — but only where it still reads exactly as the template seeded it.
-- Anything the owner has edited is left alone.

-- Column defaults follow the schema, so a fresh install starts clean too.
ALTER TABLE "SiteSettings" ALTER COLUMN "tagline" SET DEFAULT '';
ALTER TABLE "SiteSettings" ALTER COLUMN "supportEmail" SET DEFAULT 'lluwjje@gmail.com';
ALTER TABLE "SiteSettings" ALTER COLUMN "supportPhone" SET DEFAULT '01044235823';

-- The template's tagline, browser-tab title and search description.
UPDATE "SiteSettings" SET "tagline" = ''
 WHERE "tagline" = 'Considered essentials for a quiet life.';
UPDATE "SiteSettings" SET "taglineAr" = ''
 WHERE "taglineAr" = 'أساسيات مدروسة لحياة هادئة.';
UPDATE "SiteSettings" SET "metaTitle" = ''
 WHERE "metaTitle" = 'luwjje — Considered essentials';
UPDATE "SiteSettings" SET "metaTitleAr" = ''
 WHERE "metaTitleAr" = 'luwjje — أساسيات مدروسة';
UPDATE "SiteSettings"
   SET "metaDescription" = 'LUWJJE — shop online with delivery across Egypt and cash on delivery.'
 WHERE "metaDescription" = 'Quiet, well-made pieces in wool, cotton and leather. Delivered across Egypt.';
UPDATE "SiteSettings"
   SET "metaDescriptionAr" = 'LUWJJE — تسوّق أونلاين مع توصيل لكل محافظات مصر والدفع عند الاستلام.'
 WHERE "metaDescriptionAr" = 'قطع هادئة مصنوعة بعناية من الصوف والقطن والجلد. توصيل لكل محافظات مصر.';
UPDATE "SiteSettings" SET "ogImageUrl" = ''
 WHERE "ogImageUrl" LIKE '%hero-default.svg';

-- The untouched starter hero banner ("Edit this banner…").
DELETE FROM "Banner"
 WHERE "heading" = 'Considered essentials.' AND "body" LIKE 'Edit this banner%';

-- Starter About / Journal pages still holding the template text leave the top
-- navigation and the footer until the owner writes their own. The pages stay.
UPDATE "SiteSettings" SET "showAbout" = false
 WHERE EXISTS (SELECT 1 FROM "Page" WHERE "slug" = 'about' AND "body" LIKE 'Write your story here%');
UPDATE "SiteSettings" SET "showJournal" = false
 WHERE EXISTS (SELECT 1 FROM "Page" WHERE "slug" = 'journal' AND "body" LIKE '## Your first entry%');
