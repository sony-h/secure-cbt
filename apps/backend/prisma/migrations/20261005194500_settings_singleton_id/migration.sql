-- Settings is a single-row table: use a stable string key instead of a UUID.
ALTER TABLE "settings" ALTER COLUMN "id" TYPE TEXT USING "id"::text;

-- Rename the existing singleton row to the key the application expects.
UPDATE "settings" SET "id" = 'global'
WHERE (SELECT COUNT(*) FROM "settings") = 1
  AND "id" <> 'global';
