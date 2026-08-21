-- An order records the browsing session that placed it, so the visits already
-- being tracked can be followed all the way to a sale. Nullable: orders placed
-- before this, and anyone whose browser blocks the tracking call, have none.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "sessionId" TEXT;
CREATE INDEX IF NOT EXISTS "Order_sessionId_idx" ON "Order"("sessionId");

-- Visits are read by day and by session; both queries scan the whole table
-- without these.
CREATE INDEX IF NOT EXISTS "PageView_sessionId_idx" ON "PageView"("sessionId");
CREATE INDEX IF NOT EXISTS "PageView_path_idx" ON "PageView"("path");
