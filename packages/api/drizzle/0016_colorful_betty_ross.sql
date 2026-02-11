ALTER TABLE "projects" ALTER COLUMN "name" SET DEFAULT 'Drafts';
-- Rename existing default projects
UPDATE "projects" SET "name" = 'Drafts' WHERE "name" = 'Untitled Project';