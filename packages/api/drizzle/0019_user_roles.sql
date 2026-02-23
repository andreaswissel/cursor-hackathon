ALTER TABLE "users" ADD COLUMN "role" text;--> statement-breakpoint
UPDATE "users" SET "role" = 'admin' WHERE "is_admin" = 1;--> statement-breakpoint
UPDATE "users" SET "role" = 'public_user' WHERE "role" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'public_user';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_check" CHECK ("role" IN ('admin', 'beta_tester', 'public_user'));
