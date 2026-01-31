ALTER TABLE "users" ADD COLUMN "openai_api_key" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "gemini_api_key" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "active_provider" text DEFAULT 'anthropic';