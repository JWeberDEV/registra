-- Create stripe_customers table
CREATE TABLE "stripe_customers" (
    "id" serial PRIMARY KEY NOT NULL,
    "usuario_id" integer NOT NULL,
    "stripe_customer_id" varchar(255) NOT NULL,
    "email" varchar(255) NOT NULL,
    "data_criacao" timestamp
    with
        time zone DEFAULT(
            CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'
        ),
        CONSTRAINT "stripe_customers_usuario_id_unique" UNIQUE ("usuario_id"),
        CONSTRAINT "stripe_customers_stripe_customer_id_unique" UNIQUE ("stripe_customer_id")
);
--> statement-breakpoint
-- Create stripe_subscriptions table for recurring payments
CREATE TABLE "stripe_subscriptions" (
    "id" serial PRIMARY KEY NOT NULL,
    "usuario_id" integer NOT NULL,
    "stripe_subscription_id" varchar(255) NOT NULL,
    "stripe_product_id" varchar(255) NOT NULL,
    "stripe_price_id" varchar(255) NOT NULL,
    "status" varchar(20) DEFAULT 'active' NOT NULL,
    "valor_mensal" numeric(12, 2) NOT NULL,
    "data_proximo_pagamento" timestamp
    with
        time zone,
        "data_cancelamento" timestamp
    with
        time zone,
        "data_criacao" timestamp
    with
        time zone DEFAULT(
            CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'
        ),
        CONSTRAINT "stripe_subscriptions_stripe_subscription_id_unique" UNIQUE ("stripe_subscription_id")
);
--> statement-breakpoint
-- Create stripe_payment_methods table for saved cards
CREATE TABLE "stripe_payment_methods" (
    "id" serial PRIMARY KEY NOT NULL,
    "usuario_id" integer NOT NULL,
    "stripe_payment_method_id" varchar(255) NOT NULL,
    "brand" varchar(50) NOT NULL,
    "last4" varchar(4) NOT NULL,
    "exp_month" integer,
    "exp_year" integer,
    "is_default" boolean DEFAULT false NOT NULL,
    "data_criacao" timestamp
    with
        time zone DEFAULT(
            CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'
        ),
        CONSTRAINT "stripe_payment_methods_stripe_payment_method_id_unique" UNIQUE ("stripe_payment_method_id")
);
--> statement-breakpoint
-- Create stripe_connected_accounts table for marketplace (Stripe Connect)
CREATE TABLE "stripe_connected_accounts" (
    "id" serial PRIMARY KEY NOT NULL,
    "usuario_id" integer NOT NULL,
    "stripe_account_id" varchar(255) NOT NULL,
    "status" varchar(20) DEFAULT 'pending' NOT NULL,
    "ultimo_sync" timestamp
    with
        time zone,
        "data_criacao" timestamp
    with
        time zone DEFAULT(
            CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'
        ),
        CONSTRAINT "stripe_connected_accounts_usuario_id_unique" UNIQUE ("usuario_id"),
        CONSTRAINT "stripe_connected_accounts_stripe_account_id_unique" UNIQUE ("stripe_account_id")
);
--> statement-breakpoint
-- Create stripe_financial_transactions table for bank account sync
CREATE TABLE "stripe_financial_transactions" (
    "id" serial PRIMARY KEY NOT NULL,
    "usuario_id" integer NOT NULL,
    "stripe_transaction_id" varchar(255) NOT NULL,
    "tipo" varchar(10) NOT NULL,
    "valor" numeric(12, 2) NOT NULL,
    "descricao" text,
    "data_movimento" date,
    "categoria_id" integer,
    "transacao_local_id" integer,
    "data_criacao" timestamp
    with
        time zone DEFAULT(
            CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'
        ),
        CONSTRAINT "stripe_financial_transactions_stripe_transaction_id_unique" UNIQUE ("stripe_transaction_id")
);
--> statement-breakpoint
-- Create stripe_webhook_logs table for audit trail
CREATE TABLE "stripe_webhook_logs" (
    "id" serial PRIMARY KEY NOT NULL,
    "stripe_event_id" varchar(255) NOT NULL,
    "tipo" varchar(100) NOT NULL,
    "usuario_id" integer,
    "transacao_id" integer,
    "dados" jsonb,
    "processado" boolean DEFAULT false NOT NULL,
    "erro" text,
    "data_criacao" timestamp
    with
        time zone DEFAULT(
            CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'
        ),
        CONSTRAINT "stripe_webhook_logs_stripe_event_id_unique" UNIQUE ("stripe_event_id")
);
--> statement-breakpoint
-- Create indexes for common queries
CREATE INDEX "stripe_customers_usuario_id_idx" ON "stripe_customers" ("usuario_id");
--> statement-breakpoint
CREATE INDEX "stripe_subscriptions_usuario_id_idx" ON "stripe_subscriptions" ("usuario_id");
--> statement-breakpoint
CREATE INDEX "stripe_subscriptions_status_idx" ON "stripe_subscriptions" ("status");
--> statement-breakpoint
CREATE INDEX "stripe_payment_methods_usuario_id_idx" ON "stripe_payment_methods" ("usuario_id");
--> statement-breakpoint
CREATE INDEX "stripe_connected_accounts_usuario_id_idx" ON "stripe_connected_accounts" ("usuario_id");
--> statement-breakpoint
CREATE INDEX "stripe_financial_transactions_usuario_id_idx" ON "stripe_financial_transactions" ("usuario_id");
--> statement-breakpoint
CREATE INDEX "stripe_financial_transactions_data_movimento_idx" ON "stripe_financial_transactions" ("data_movimento");
--> statement-breakpoint
CREATE INDEX "stripe_webhook_logs_usuario_id_idx" ON "stripe_webhook_logs" ("usuario_id");
--> statement-breakpoint
CREATE INDEX "stripe_webhook_logs_tipo_idx" ON "stripe_webhook_logs" ("tipo");