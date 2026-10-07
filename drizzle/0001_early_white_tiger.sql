CREATE TYPE "public"."block_status" AS ENUM('pending', 'writing', 'ready', 'failed', 'stale');--> statement-breakpoint
CREATE TYPE "public"."plan_status" AS ENUM('generating', 'paused', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."revision_source" AS ENUM('generation', 'chat', 'restore');--> statement-breakpoint
CREATE TYPE "public"."usage_kind" AS ENUM('generation', 'chat');--> statement-breakpoint
CREATE TABLE "plan_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"idx" integer NOT NULL,
	"start_day" integer NOT NULL,
	"end_day" integer NOT NULL,
	"theme" text NOT NULL,
	"objective" text NOT NULL,
	"covers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"not_covers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"milestone" jsonb NOT NULL,
	"status" "block_status" DEFAULT 'pending' NOT NULL,
	"error" text,
	CONSTRAINT "plan_blocks_plan_idx_unique" UNIQUE("plan_id","idx")
);
--> statement-breakpoint
CREATE TABLE "plan_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"block_id" uuid NOT NULL,
	"day" integer NOT NULL,
	"title" text NOT NULL,
	"learn" text NOT NULL,
	"practice" text NOT NULL,
	"review" text NOT NULL,
	"minutes" integer NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "plan_days_plan_day_unique" UNIQUE("plan_id","day")
);
--> statement-breakpoint
CREATE TABLE "plan_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"source" "revision_source" NOT NULL,
	"message_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_revisions_plan_number_unique" UNIQUE("plan_id","number")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"goal" text NOT NULL,
	"inputs" jsonb NOT NULL,
	"topic_tag" text,
	"status" "plan_status" DEFAULT 'generating' NOT NULL,
	"start_date" date NOT NULL,
	"provider" "provider" NOT NULL,
	"model" text NOT NULL,
	"overview" text,
	"final_outcome" text,
	"ledger" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"current_revision" integer DEFAULT 0 NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" "usage_kind" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plan_blocks" ADD CONSTRAINT "plan_blocks_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_days" ADD CONSTRAINT "plan_days_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_days" ADD CONSTRAINT "plan_days_block_id_plan_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."plan_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_revisions" ADD CONSTRAINT "plan_revisions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plans_user_updated_idx" ON "plans" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "usage_events_user_created_idx" ON "usage_events" USING btree ("user_id","created_at");