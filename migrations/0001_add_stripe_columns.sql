-- Add Stripe payment tracking columns to transacoes table
ALTER TABLE "transacoes" ADD COLUMN "stripe_payment_id" varchar(255);
--> statement-breakpoint
ALTER TABLE "transacoes"
ADD COLUMN "stripe_customer_id" varchar(255);
--> statement-breakpoint
ALTER TABLE "transacoes"
ADD COLUMN "stripe_subscription_id" varchar(255);
--> statement-breakpoint
ALTER TABLE "transacoes" ADD COLUMN "gateway_status" varchar(50);
--> statement-breakpoint
ALTER TABLE "transacoes" ADD COLUMN "gateway_metadata" jsonb;
--> statement-breakpoint
ALTER TABLE "transacoes" ADD COLUMN "gateway_error" text;
--> statement-breakpoint
-- Create unique constraint on stripe_payment_id to prevent duplicates
CREATE UNIQUE INDEX "transacoes_stripe_payment_id_unique" ON "transacoes" ("stripe_payment_id")
WHERE
    "stripe_payment_id" IS NOT NULL;
--> statement-breakpoint
-- Add stripe_customer_id column to usuarios table for quick lookup
ALTER TABLE "usuarios" ADD COLUMN "stripe_customer_id" varchar(255);
--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_stripe_customer_id_unique" ON "usuarios" ("stripe_customer_id")
WHERE
    "stripe_customer_id" IS NOT NULL;