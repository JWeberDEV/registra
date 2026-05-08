import { stripe } from '../config/stripe';
import type {
  CreateSubscriptionRequest,
  SubscriptionResponse,
} from '../types/stripe.types';
import { storage } from '../storage';
import { StripePaymentService } from './stripe-payment.service';

/**
 * Service para gerenciar Subscriptions (pagamentos recorrentes) do Stripe
 */
export class StripeSubscriptionService {
  /**
   * Criar uma nova assinatura para um usuário
   * stripePriceId deve ser um price ID válido do Stripe
   */
  static async createSubscription(
    usuarioId: number,
    email: string,
    stripePriceId: string,
    metadados?: Record<string, string>,
    descricao?: string
  ): Promise<SubscriptionResponse> {
    try {
      // Criar ou obter Stripe customer
      const stripeCustumerId = await StripePaymentService.createOrUpdateCustomer(
        usuarioId,
        email
      );

      // Obter informações do preço
      const price = await stripe.prices.retrieve(stripePriceId);
      const product = await stripe.products.retrieve(price.product as string);

      // Criar subscription
      const subscription = await stripe.subscriptions.create({
        customer: stripeCustumerId,
        items: [{ price: stripePriceId }],
        metadata: {
          usuario_id: String(usuarioId),
          product_id: product.id,
          ...metadados,
        },
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      // Valor mensal em reais
      const valorMensal = (price.unit_amount ?? 0) / 100;
      const dataPróximoPagamento = new Date(
        (subscription.current_period_end ?? 0) * 1000
      );

      // Salvar subscription no banco de dados
      await storage.query(
        `INSERT INTO "stripe_subscriptions" 
        (usuario_id, stripe_subscription_id, stripe_product_id, stripe_price_id, status, valor_mensal, data_proximo_pagamento)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          usuarioId,
          subscription.id,
          product.id,
          stripePriceId,
          subscription.status || 'active',
          valorMensal,
          dataPróximoPagamento,
        ]
      );

      console.log(
        `✅ Subscription created: ${subscription.id} for user ${usuarioId}`
      );

      return {
        subscriptionId: subscription.id,
        status: subscription.status || 'active',
        currentPeriodStart: subscription.current_period_start ?? 0,
        currentPeriodEnd: subscription.current_period_end ?? 0,
        proximoPagamento: dataPróximoPagamento,
        valor: valorMensal,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error creating subscription: ${errorMsg}`);
      throw new Error(`Failed to create subscription: ${errorMsg}`);
    }
  }

  /**
   * Obter todas as assinaturas ativas de um usuário
   */
  static async listSubscriptions(
    usuarioId: number
  ): Promise<SubscriptionResponse[]> {
    try {
      const result = await storage.query(
        `SELECT stripe_subscription_id, status, valor_mensal, data_proximo_pagamento
        FROM "stripe_subscriptions"
        WHERE usuario_id = $1 AND status != 'canceled'
        ORDER BY data_criacao DESC`,
        [usuarioId]
      );

      return result.rows.map((row) => ({
        subscriptionId: row.stripe_subscription_id,
        status: row.status,
        currentPeriodStart: 0,
        currentPeriodEnd: 0,
        proximoPagamento: new Date(row.data_proximo_pagamento),
        valor: parseFloat(row.valor_mensal),
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error listing subscriptions: ${errorMsg}`);
      throw new Error(`Failed to list subscriptions: ${errorMsg}`);
    }
  }

  /**
   * Obter detalhes de uma subscription específica
   */
  static async getSubscription(
    subscriptionId: string
  ): Promise<SubscriptionResponse> {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      const valorMensal = subscription.items.data[0]?.price?.unit_amount
        ? (subscription.items.data[0].price.unit_amount as number) / 100
        : 0;

      return {
        subscriptionId: subscription.id,
        status: subscription.status || 'active',
        currentPeriodStart: subscription.current_period_start ?? 0,
        currentPeriodEnd: subscription.current_period_end ?? 0,
        proximoPagamento: new Date((subscription.current_period_end ?? 0) * 1000),
        valor: valorMensal,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error retrieving subscription: ${errorMsg}`);
      throw new Error(`Failed to retrieve subscription: ${errorMsg}`);
    }
  }

  /**
   * Atualizar preço/plano de uma assinatura
   */
  static async updateSubscriptionPlan(
    subscriptionId: string,
    newStripePriceId: string,
    prorationBehavior: 'create_prorations' | 'none' = 'create_prorations'
  ): Promise<SubscriptionResponse> {
    try {
      const subscription = await stripe.subscriptions.retrieve(
        subscriptionId
      );

      const currentItemId = subscription.items.data[0]?.id;

      if (!currentItemId) {
        throw new Error('No subscription item found');
      }

      // Atualizar item de subscription
      const updated = await stripe.subscriptions.update(subscriptionId, {
        items: [
          {
            id: currentItemId,
            price: newStripePriceId,
          },
        ],
        proration_behavior: prorationBehavior,
      });

      const newPrice = await stripe.prices.retrieve(newStripePriceId);
      const valorMensal = (newPrice.unit_amount ?? 0) / 100;

      // Atualizar no banco de dados
      await storage.query(
        `UPDATE "stripe_subscriptions" 
        SET stripe_price_id = $1, valor_mensal = $2, data_proximo_pagamento = $3
        WHERE stripe_subscription_id = $4`,
        [
          newStripePriceId,
          valorMensal,
          new Date((updated.current_period_end ?? 0) * 1000),
          subscriptionId,
        ]
      );

      console.log(`✅ Subscription plan updated: ${subscriptionId}`);

      return {
        subscriptionId: updated.id,
        status: updated.status || 'active',
        currentPeriodStart: updated.current_period_start ?? 0,
        currentPeriodEnd: updated.current_period_end ?? 0,
        proximoPagamento: new Date((updated.current_period_end ?? 0) * 1000),
        valor: valorMensal,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error updating subscription plan: ${errorMsg}`);
      throw new Error(`Failed to update subscription plan: ${errorMsg}`);
    }
  }

  /**
   * Cancelar uma assinatura
   */
  static async cancelSubscription(
    subscriptionId: string,
    atPeriodEnd: boolean = true
  ): Promise<void> {
    try {
      if (atPeriodEnd) {
        // Cancelar ao final do período atual
        await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      } else {
        // Cancelar imediatamente
        await stripe.subscriptions.del(subscriptionId);
      }

      // Atualizar no banco de dados
      await storage.query(
        `UPDATE "stripe_subscriptions" 
        SET status = 'canceled', data_cancelamento = NOW()
        WHERE stripe_subscription_id = $1`,
        [subscriptionId]
      );

      console.log(`✅ Subscription canceled: ${subscriptionId}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error canceling subscription: ${errorMsg}`);
      throw new Error(`Failed to cancel subscription: ${errorMsg}`);
    }
  }

  /**
   * Reativar uma assinatura cancelada
   */
  static async resumeSubscription(subscriptionId: string): Promise<SubscriptionResponse> {
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });

      // Atualizar no banco de dados
      await storage.query(
        `UPDATE "stripe_subscriptions" 
        SET status = $1, data_cancelamento = NULL
        WHERE stripe_subscription_id = $2`,
        [subscription.status || 'active', subscriptionId]
      );

      const valorMensal = subscription.items.data[0]?.price?.unit_amount
        ? (subscription.items.data[0].price.unit_amount as number) / 100
        : 0;

      console.log(`✅ Subscription resumed: ${subscriptionId}`);

      return {
        subscriptionId: subscription.id,
        status: subscription.status || 'active',
        currentPeriodStart: subscription.current_period_start ?? 0,
        currentPeriodEnd: subscription.current_period_end ?? 0,
        proximoPagamento: new Date((subscription.current_period_end ?? 0) * 1000),
        valor: valorMensal,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error resuming subscription: ${errorMsg}`);
      throw new Error(`Failed to resume subscription: ${errorMsg}`);
    }
  }
}
