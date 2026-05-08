import Stripe from 'stripe';

/**
 * Payment gateway statuses
 * Maps to database gateway_status field
 */
export enum GatewayStatus {
  CREATED = 'created', // Payment intent created, awaiting payment
  PROCESSING = 'processing', // Payment is being processed
  SUCCEEDED = 'succeeded', // Payment successful
  PAYMENT_FAILED = 'payment_failed', // Payment failed
  REQUIRES_ACTION = 'requires_action', // Requires 3D Secure or similar
  CANCELED = 'canceled', // Payment canceled
  REFUNDED = 'refunded', // Payment refunded
}

/**
 * Stripe customer context stored in session/request
 */
export interface StripeCustomerContext {
  id: string;
  usuarioId: number;
  stripeCustomerId: string;
  email: string;
  createdAt: Date;
}

/**
 * Payment intent creation request
 */
export interface CreatePaymentIntentRequest {
  valor: number; // Amount in cents
  descricao: string;
  carteira_id?: number;
  categoria_id?: number;
  metadados?: Record<string, string>;
}

/**
 * Payment intent response
 */
export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  status: string;
  valor: number;
}

/**
 * Setup intent for saving cards
 */
export interface CreateSetupIntentRequest {
  descricao?: string;
}

/**
 * Setup intent response
 */
export interface SetupIntentResponse {
  clientSecret: string;
  setupIntentId: string;
}

/**
 * Subscription creation request
 */
export interface CreateSubscriptionRequest {
  stripePriceId: string;
  metadados?: Record<string, string>;
  descricao?: string;
}

/**
 * Subscription response
 */
export interface SubscriptionResponse {
  subscriptionId: string;
  status: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  proximoPagamento: Date;
  valor: number;
}

/**
 * Webhook event data stored in database
 */
export interface WebhookEventLog {
  stripeEventId: string;
  tipo: string;
  usuarioId?: number;
  transacaoId?: number;
  dados: Record<string, unknown>;
  processado: boolean;
  erro?: string;
  dataCriacao: Date;
}

/**
 * Payment intent webhook event
 */
export interface PaymentIntentWebhookEvent {
  id: string;
  object: 'payment_intent';
  amount: number;
  currency: string;
  customer?: string;
  metadata?: Record<string, string>;
  status: string;
  client_secret?: string;
  last_payment_error?: {
    message: string;
    type: string;
  };
}

/**
 * Charge webhook event
 */
export interface ChargeWebhookEvent {
  id: string;
  object: 'charge';
  amount: number;
  currency: string;
  customer?: string;
  payment_intent?: string;
  refunded: boolean;
  refunds?: {
    data: Array<{
      id: string;
      amount: number;
    }>;
  };
  metadata?: Record<string, string>;
}

/**
 * Subscription webhook event
 */
export interface SubscriptionWebhookEvent {
  id: string;
  object: 'subscription';
  customer: string;
  items: {
    data: Array<{
      price: {
        id: string;
        product: string;
      };
    }>;
  };
  status: string;
  current_period_start: number;
  current_period_end: number;
  metadata?: Record<string, string>;
}

/**
 * Database transaction with Stripe fields
 */
export interface TransacaoComStripe {
  id: number;
  carteira_id: number;
  usuario_id: number;
  categoria_id?: number;
  forma_pagamento_id?: number;
  tipo: 'Despesa' | 'Receita';
  valor: number;
  data_transacao: Date;
  status: 'Pendente' | 'Efetivada' | 'Agendada' | 'Cancelada';
  descricao?: string;
  // Stripe fields
  stripe_payment_id?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  gateway_status?: string;
  gateway_metadata?: Record<string, unknown>;
  gateway_error?: string;
  dataCriacao: Date;
}

/**
 * Stripe customer in database
 */
export interface StripeCustomerRecord {
  id: number;
  usuario_id: number;
  stripe_customer_id: string;
  email: string;
  data_criacao: Date;
}

/**
 * Stripe payment method (saved card)
 */
export interface StripePaymentMethodRecord {
  id: number;
  usuario_id: number;
  stripe_payment_method_id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
  data_criacao: Date;
}

/**
 * Stripe subscription in database
 */
export interface StripeSubscriptionRecord {
  id: number;
  usuario_id: number;
  stripe_subscription_id: string;
  stripe_product_id: string;
  stripe_price_id: string;
  status: 'active' | 'past_due' | 'canceled' | 'paused';
  valor_mensal: number;
  data_proximo_pagamento: Date;
  data_cancelamento?: Date;
  data_criacao: Date;
}

/**
 * Connected Stripe account (for marketplace)
 */
export interface StripeConnectedAccountRecord {
  id: number;
  usuario_id: number;
  stripe_account_id: string;
  status: 'active' | 'pending' | 'disabled';
  ultimo_sync?: Date;
  data_criacao: Date;
}

/**
 * Financial transaction from Stripe Financials API
 */
export interface StripeFinancialTransactionRecord {
  id: number;
  usuario_id: number;
  stripe_transaction_id: string;
  tipo: 'debit' | 'credit';
  valor: number;
  descricao: string;
  data_movimento: Date;
  categoria_id?: number;
  transacao_local_id?: number;
  data_criacao: Date;
}

/**
 * Error response from webhook processing
 */
export interface WebhookErrorResponse {
  erro: string;
  detalhes?: string;
  stripeEventId?: string;
}

/**
 * Success response from webhook processing
 */
export interface WebhookSuccessResponse {
  sucesso: boolean;
  mensagem: string;
  eventId: string;
}
