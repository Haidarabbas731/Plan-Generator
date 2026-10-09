ALTER TABLE "conversations" DROP CONSTRAINT "conversations_plan_unique";--> statement-breakpoint
CREATE INDEX "conversations_plan_created_idx" ON "conversations" USING btree ("plan_id","created_at");