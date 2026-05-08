import { stripe, getStripeWebhookSecret } from '../config/stripe';
import type {
  PaymentIntentWebhookEvent,
  ChargeWebhookEvent,
  SubscriptionWebhookEvent,
  WebhookErrorResponse,
  WebhookSuccessResponse,
} from '../types/stripe.types';
import { storage } from '../storage';

/**
 * Service para processar eventos de webhook do Stripe
 * Todos os handlers são síncronos conforme requisitado
 */
export class StripeEventService {
  /**
   * Validar assinatura do webhook com a secret do Stripe
   * Retorna o evento validado ou lança erro
   */
  static validateWebhookSignature(
    body: string,
    signature: string
  ): Record<string, unknown> {
    const secret = getStripeWebhookSecret();

    try {
      const event = stripe.webhooks.constructEvent(body, signature, secret);
      return event;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Webhook signature validation failed: ${errorMessage}`);
    }
  }

  /**
   * Log webhook event para auditoria
   */
  static async logWebhookEvent(
    eventId: string,
    eventType: string,
    usuarioId: number | undefined,
    transacaoId: number | undefined,
    dados: Record<string, unknown>,
    erro?: string
  ): Promise<void> {
    try {
      const result = await storage.query(
        `INSERT INTO "stripe_webhook_logs" 
        (stripe_event_id, tipo, usuario_id, transacao_id, dados, processado, erro)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          eventId,
          eventType,
          usuarioId ?? null,
          transacaoId ?? null,
          JSON.stringify(dados),
          !erro,
          erro ?? null,
        ]
      );
      console.log(`✅ Webhook event logged: ${eventId} (${eventType})`);
    } catch (error) {
      console.error(`❌ Error logging webhook event: ${eventId}`, error);
    }
  }

  /**
   * Handle payment_intent.succeeded - Marcar transação como efetivada
   */
  static async handlePaymentIntentSucceeded(
    event: PaymentIntentWebhookEvent
  ): Promise<void> {
    try {
      const paymentIntentId = event.id;
      const stripeCustumerId = event.customer;

      if (!paymentIntentId) {
        throw new Error('No payment intent ID in event');
      }

      // Buscar transação associada
      const transacao = await storage.query(
        `SELECT id, usuario_id FROM "transacoes" WHERE stripe_payment_id = $1 LIMIT 1`,
        [paymentIntentId]
      );

      if (transacao.rows.length === 0) {
        console.warn(
          `⚠️ Transaction not found for payment intent: ${paymentIntentId}`
        );
        return;
      }

      const transacaoId = transacao.rows[0].id;
      const usuarioId = transacao.rows[0].usuario_id;

      // Atualizar status para "Efetivada"
      await storage.query(
        `UPDATE "transacoes" 
        SET status = 'Efetivada', gateway_status = $1, gateway_metadata = $2
        WHERE id = $3`,
        [
          'succeeded',
          JSON.stringify({
            stripe_payment_id: paymentIntentId,
            amount: event.amount,
            currency: event.currency,
            timestamp: new Date().toISOString(),
          }),
          transacaoId,
        ]
      );

      await this.logWebhookEvent(
        event.id,
        'payment_intent.succeeded',
        usuarioId,
        transacaoId,
        event as unknown as Record<string, unknown>
      );

      console.log(
        `✅ Transaction marked as succeeded: ${transacaoId} (${paymentIntentId})`
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error handling payment_intent.succeeded:`, error);
      throw error;
    }
  }

  /**
   * Handle payment_intent.payment_failed - Marcar como cancelada com erro
   */
  static async handlePaymentIntentPaymentFailed(
    event: PaymentIntentWebhookEvent
  ): Promise<void> {
    try {
      const paymentIntentId = event.id;

      if (!paymentIntentId) {
        throw new Error('No payment intent ID in event');
      }

      // Buscar transação
      const transacao = await storage.query(
        `SELECT id, usuario_id FROM "transacoes" WHERE stripe_payment_id = $1 LIMIT 1`,
        [paymentIntentId]
      );

      if (transacao.rows.length === 0) {
        console.warn(
          `⚠️ Transaction not found for payment intent: ${paymentIntentId}`
        );
        return;
      }

      const transacaoId = transacao.rows[0].id;
      const usuarioId = transacao.rows[0].usuario_id;

      const errorMsg =
        event.last_payment_error?.message || 'Unknown payment error';

      // Atualizar status para "Cancelada"
      await storage.query(
        `UPDATE "transacoes" 
        SET status = 'Cancelada', gateway_status = $1, gateway_error = $2, gateway_metadata = $3
        WHERE id = $4`,
        [
          'payment_failed',
          errorMsg,
          JSON.stringify({
            error_type: event.last_payment_error?.type,
            stripe_payment_id: paymentIntentId,
            timestamp: new Date().toISOString(),
          }),
          transacaoId,
        ]
      );

      await this.logWebhookEvent(
        event.id,
        'payment_intent.payment_failed',
        usuarioId,
        transacaoId,
        event as unknown as Record<string, unknown>,
        errorMsg
      );

      console.log(
        `❌ Transaction marked as failed: ${transacaoId} - ${errorMsg}`
      );
    } catch (error) {
      console.error(`❌ Error handling payment_intent.payment_failed:`, error);
      throw error;
    }
  }

  /**
   * Handle customer.subscription.created - Registrar nova assinatura
   */
  static async handleCustomerSubscriptionCreated(
    event: SubscriptionWebhookEvent
  ): Promise<void> {
    try {
      const subscriptionId = event.id;
      const stripeCustumerId = event.customer;

      if (!subscriptionId || !stripeCustumerId) {
        throw new Error('Missing subscription or customer ID');
      }

      // Buscar usuário pelo stripe_customer_id
      const usuario = await storage.query(
        `SELECT id FROM "usuarios" WHERE stripe_customer_id = $1 LIMIT 1`,
        [stripeCustumerId]
      );

      if (usuario.rows.length === 0) {
        console.warn(
          `⚠️ User not found for stripe customer: ${stripeCustumerId}`
        );
        return;
      }

      const usuarioId = usuario.rows[0].id;

      // Extrair informações de preço/produto
      const priceId = event.items?.data?.[0]?.price?.id;
      const productId = event.items?.data?.[0]?.price?.product;

      if (!priceId || !productId) {
        throw new Error('Missing price or product ID in subscription event');
      }

      // Buscar preço do Stripe para obter valor
      const priceObject = await stripe.prices.retrieve(priceId);
      const valorMensal =
        (priceObject.unit_amount ?? 0) / 100; // Stripe armazena em centavos

      const dataPróximoPagamento = new Date(
        (event.current_period_end ?? 0) * 1000
      );

      // Inserir assinatura no banco (idempotente: ON CONFLICT atualiza)
      await storage.query(
        `INSERT INTO "stripe_subscriptions"
        (usuario_id, stripe_subscription_id, stripe_product_id, stripe_price_id, status, valor_mensal, data_proximo_pagamento)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (stripe_subscription_id) DO UPDATE
          SET status = EXCLUDED.status,
              stripe_product_id = EXCLUDED.stripe_product_id,
              stripe_price_id = EXCLUDED.stripe_price_id,
              valor_mensal = EXCLUDED.valor_mensal,
              data_proximo_pagamento = EXCLUDED.data_proximo_pagamento`,
        [
          usuarioId,
          subscriptionId,
          productId,
          priceId,
          event.status || 'active',
          valorMensal,
          dataPróximoPagamento,
        ]
      );

      // Ativar plano do usuário: data_expiracao_assinatura = current_period_end.
      // Só ativa se a subscription estiver em estado "saudável".
      // Estados que NÃO ativam: incomplete, incomplete_expired, unpaid, past_due (antes do pagamento).
      const statusAtivos = ['active', 'trialing'];
      if (statusAtivos.includes(event.status as string)) {
        await storage.query(
          `UPDATE "usuarios"
          SET status_assinatura = 'ativa',
              data_expiracao_assinatura = $1,
              ativo = true,
              data_cancelamento = NULL,
              motivo_cancelamento = NULL
          WHERE id = $2`,
          [dataPróximoPagamento, usuarioId]
        );
        console.log(
          `🔓 User ${usuarioId} subscription ACTIVATED until ${dataPróximoPagamento.toISOString()}`
        );
      } else {
        console.log(
          `⏸ Subscription ${subscriptionId} created with non-active status: ${event.status} — user not yet activated`
        );
      }

      await this.logWebhookEvent(
        event.id,
        'customer.subscription.created',
        usuarioId,
        undefined,
        event as unknown as Record<string, unknown>
      );

      console.log(
        `✅ Subscription created: ${subscriptionId} for user ${usuarioId}`
      );
    } catch (error) {
      console.error(`❌ Error handling customer.subscription.created:`, error);
      throw error;
    }
  }

  /**
   * Handle customer.subscription.updated - Sincronizar renovações e mudanças
   * de plano. Atualiza data_expiracao_assinatura no usuário (renovação) e
   * trata transições de status (active → past_due → canceled etc).
   */
  static async handleCustomerSubscriptionUpdated(
    event: SubscriptionWebhookEvent
  ): Promise<void> {
    try {
      const subscriptionId = event.id;
      const stripeCustumerId = event.customer;

      if (!subscriptionId || !stripeCustumerId) {
        throw new Error('Missing subscription or customer ID');
      }

      const usuario = await storage.query(
        `SELECT id FROM "usuarios" WHERE stripe_customer_id = $1 LIMIT 1`,
        [stripeCustumerId]
      );

      if (usuario.rows.length === 0) {
        console.warn(
          `⚠️ User not found for stripe customer: ${stripeCustumerId}`
        );
        return;
      }

      const usuarioId = usuario.rows[0].id;

      const priceId = event.items?.data?.[0]?.price?.id;
      const productId = event.items?.data?.[0]?.price?.product;
      const status = (event.status as string) || 'active';
      const dataPróximoPagamento = new Date(
        (event.current_period_end ?? 0) * 1000
      );

      // Atualizar registro de subscription
      await storage.query(
        `UPDATE "stripe_subscriptions"
        SET status = $1,
            stripe_product_id = COALESCE($2, stripe_product_id),
            stripe_price_id = COALESCE($3, stripe_price_id),
            data_proximo_pagamento = $4
        WHERE stripe_subscription_id = $5`,
        [status, productId, priceId, dataPróximoPagamento, subscriptionId]
      );

      // Sincronizar status do usuário com o status do Stripe
      const statusAtivos = ['active', 'trialing'];
      const statusBloqueados = ['canceled', 'unpaid', 'incomplete_expired'];

      if (statusAtivos.includes(status)) {
        // Renovação ou retomada: estender expiração e garantir ativo
        await storage.query(
          `UPDATE "usuarios"
          SET status_assinatura = 'ativa',
              data_expiracao_assinatura = $1,
              ativo = true
          WHERE id = $2`,
          [dataPróximoPagamento, usuarioId]
        );
        console.log(
          `🔄 User ${usuarioId} subscription RENEWED until ${dataPróximoPagamento.toISOString()}`
        );
      } else if (statusBloqueados.includes(status)) {
        // Pagamento falhou ou foi cancelado: marcar como cancelada mas
        // respeitar a data de expiração atual (acesso até o fim do período)
        await storage.query(
          `UPDATE "usuarios"
          SET status_assinatura = 'cancelada'
          WHERE id = $1`,
          [usuarioId]
        );
        console.log(
          `⚠️ User ${usuarioId} subscription status changed to: ${status}`
        );
      } else if (status === 'past_due') {
        // Stripe tentará cobrar de novo. Não bloqueia ainda, mas sinaliza.
        console.log(
          `⏰ User ${usuarioId} subscription is PAST_DUE — Stripe will retry`
        );
      }

      await this.logWebhookEvent(
        event.id,
        'customer.subscription.updated',
        usuarioId,
        undefined,
        event as unknown as Record<string, unknown>
      );

      console.log(
        `✅ Subscription updated: ${subscriptionId} (status=${status})`
      );
    } catch (error) {
      console.error(`❌ Error handling customer.subscription.updated:`, error);
      throw error;
    }
  }

  /**
   * Handle customer.subscription.deleted - Cancelar assinatura e bloquear
   * acesso do usuário ao final do período corrente.
   */
  static async handleCustomerSubscriptionDeleted(
    event: SubscriptionWebhookEvent
  ): Promise<void> {
    try {
      const subscriptionId = event.id;
      const stripeCustumerId = event.customer;

      if (!subscriptionId) {
        throw new Error('No subscription ID in event');
      }

      const usuario = await storage.query(
        `SELECT id FROM "usuarios" WHERE stripe_customer_id = $1 LIMIT 1`,
        [stripeCustumerId]
      );

      if (usuario.rows.length === 0) {
        console.warn(
          `⚠️ User not found for stripe customer: ${stripeCustumerId}`
        );
        return;
      }

      const usuarioId = usuario.rows[0].id;

      // Atualizar registro de subscription
      await storage.query(
        `UPDATE "stripe_subscriptions"
        SET status = 'canceled', data_cancelamento = NOW()
        WHERE stripe_subscription_id = $1`,
        [subscriptionId]
      );

      // Determinar data de expiração: respeitar current_period_end se existir,
      // caso contrário expirar imediatamente.
      const periodEnd = event.current_period_end
        ? new Date(event.current_period_end * 1000)
        : new Date();

      await storage.query(
        `UPDATE "usuarios"
        SET status_assinatura = 'cancelada',
            data_expiracao_assinatura = $1,
            data_cancelamento = NOW(),
            motivo_cancelamento = COALESCE(motivo_cancelamento, 'Cancelado via Stripe')
        WHERE id = $2`,
        [periodEnd, usuarioId]
      );

      await this.logWebhookEvent(
        event.id,
        'customer.subscription.deleted',
        usuarioId,
        undefined,
        event as unknown as Record<string, unknown>
      );

      console.log(
        `🚫 Subscription canceled: ${subscriptionId} — user ${usuarioId} access until ${periodEnd.toISOString()}`
      );
    } catch (error) {
      console.error(
        `❌ Error handling customer.subscription.deleted:`,
        error
      );
      throw error;
    }
  }

  /**
   * Handle charge.refunded - Criar transação de reembolso
   */
  static async handleChargeRefunded(
    event: ChargeWebhookEvent
  ): Promise<void> {
    try {
      const chargeId = event.id;
      const paymentIntentId = event.payment_intent;
      const stripeCustumerId = event.customer;

      if (!paymentIntentId) {
        console.warn('⚠️ No payment intent ID in refund event');
        return;
      }

      // Buscar transação original
      const transacao = await storage.query(
        `SELECT id, usuario_id, carteira_id, categoria_id, forma_pagamento_id, valor 
        FROM "transacoes" WHERE stripe_payment_id = $1 LIMIT 1`,
        [paymentIntentId]
      );

      if (transacao.rows.length === 0) {
        console.warn(
          `⚠️ Original transaction not found for payment intent: ${paymentIntentId}`
        );
        return;
      }

      const original = transacao.rows[0];
      const usuarioId = original.usuario_id;

      // Calcular valor do reembolso
      const refundAmount =
        event.refunds?.data?.[0]?.amount ?? event.amount;
      const refundValue = refundAmount / 100;

      // Criar transação de reembolso (transação oposta)
      const novaTransacao = await storage.query(
        `INSERT INTO "transacoes" 
        (carteira_id, categoria_id, forma_pagamento_id, tipo, valor, data_transacao, descricao, status, stripe_payment_id, gateway_status, gateway_metadata)
        VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, $7, $8, $9, $10)
        RETURNING id`,
        [
          original.carteira_id,
          original.categoria_id,
          original.forma_pagamento_id,
          original.valor > 0 ? 'Receita' : 'Despesa', // Inverter tipo
          refundValue,
          `Reembolso de ${original.valor} (${chargeId})`,
          'Efetivada',
          `${paymentIntentId}-refund`,
          'refunded',
          JSON.stringify({
            refund_id: chargeId,
            original_payment_intent: paymentIntentId,
            refund_amount: refundAmount,
            timestamp: new Date().toISOString(),
          }),
        ]
      );

      await this.logWebhookEvent(
        event.id,
        'charge.refunded',
        usuarioId,
        novaTransacao.rows[0].id,
        event as unknown as Record<string, unknown>
      );

      console.log(
        `✅ Refund transaction created: ${novaTransacao.rows[0].id} (${chargeId})`
      );
    } catch (error) {
      console.error(`❌ Error handling charge.refunded:`, error);
      throw error;
    }
  }
}
