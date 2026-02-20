ALTER TABLE "waitlist" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "company" text;--> statement-breakpoint
ALTER TABLE "waitlist" ALTER COLUMN "role" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "waitlist" ALTER COLUMN "use_case" DROP NOT NULL;
