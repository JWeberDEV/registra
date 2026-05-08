import { stripe } from '../config/stripe';
import type {
  CreatePaymentIntentRequest,
  PaymentIntentResponse,
  StripeCustomerRecord,
} from '../types/stripe.types';
import { storage } from '../storage';

/**
 * Service para gerenciar Payment Intents do Stripe
 * Responsável por criar e confirmar pagamentos
 */
export class StripePaymentService {
  /**
   * Criar ou recuperar Stripe customer para um usuário
   * Se não existir, cria novo. Se existir, retorna o existente.
   */
  static async createOrUpdateCustomer(
    usuarioId: number,
    email: string
  ): Promise<string> {
    try {
      // Verificar se já existe Stripe customer para este usuário
      const existingCustomer = await storage.query(
        `SELECT stripe_customer_id FROM "stripe_customers" WHERE usuario_id = $1 LIMIT 1`,
        [usuarioId]
      );

      if (existingCustomer.rows.length > 0) {
        return existingCustomer.rows[0].stripe_customer_id;
      }

      // Criar novo customer no Stripe
      const customer = await stripe.customers.create({
        email,
        metadata: {
          usuario_id: String(usuarioId),
          plataforma: 'financehub',
        },
      });

      // Salvar referência no banco de dados
      await storage.query(
        `INSERT INTO "stripe_customers" (usuario_id, stripe_customer_id, email)
        VALUES ($1, $2, $3)
        ON CONFLICT (usuario_id) DO UPDATE SET
          stripe_customer_id = $2,
          email = $3`,
        [usuarioId, customer.id, email]
      );

      // Também atualizar a tabela usuarios com o stripe_customer_id
      await storage.query(
        `UPDATE "usuarios" SET stripe_customer_id = $1 WHERE id = $2`,
        [customer.id, usuarioId]
      );

      console.log(`✅ Stripe customer created: ${customer.id} for user ${usuarioId}`);
      return customer.id;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error creating Stripe customer: ${errorMsg}`);
      throw new Error(`Failed to create Stripe customer: ${errorMsg}`);
    }
  }

  /**
   * Criar um Payment Intent para pagamento único
   * Retorna clientSecret para uso no frontend
   */
  static async createPaymentIntent(
    usuarioId: number,
    valor: number,
    email: string,
    descricao: string,
    metadados?: Record<string, string>
  ): Promise<PaymentIntentResponse> {
    try {
      // Criar ou recuperar customer Stripe
      const stripeCustumerId = await this.createOrUpdateCustomer(
        usuarioId,
        email
      );

      // Valor em centavos
      const amountCents = Math.round(valor * 100);

      // Criar payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'brl',
        customer: stripeCustumerId,
        description: descricao,
        metadata: {
          usuario_id: String(usuarioId),
          ...metadados,
        },
      });

      console.log(`✅ Payment intent created: ${paymentIntent.id} (R$ ${valor})`);

      return {
        clientSecret: paymentIntent.client_secret || '',
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        valor,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error creating payment intent: ${errorMsg}`);
      throw new Error(`Failed to create payment intent: ${errorMsg}`);
    }
  }

  /**
   * Recuperar status de um Payment Intent
   */
  static async getPaymentIntentStatus(
    paymentIntentId: string
  ): Promise<{
    status: string;
    amount: number;
    customer?: string;
    error?: string;
  }> {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId
      );

      return {
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100, // Converter de centavos
        customer: paymentIntent.customer?.toString(),
        error: paymentIntent.last_payment_error?.message,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(
        `❌ Error retrieving payment intent ${paymentIntentId}: ${errorMsg}`
      );
      throw new Error(`Failed to retrieve payment intent: ${errorMsg}`);
    }
  }

  /**
   * Confirmar um Payment Intent (para 3D Secure ou similar)
   * Usado quando payment_method está pronto
   */
  static async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId?: string
  ): Promise<PaymentIntentResponse> {
    try {
      const confirmParams: {
        payment_method?: string;
        return_url?: string;
      } = {};

      if (paymentMethodId) {
        confirmParams.payment_method = paymentMethodId;
      }

      // Return URL para 3D Secure redirect
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      confirmParams.return_url = `${baseUrl}/pagamentos/confirmar`;

      const paymentIntent = await stripe.paymentIntents.confirm(
        paymentIntentId,
        confirmParams
      );

      console.log(
        `✅ Payment intent confirmed: ${paymentIntentId} - Status: ${paymentIntent.status}`
      );

      return {
        clientSecret: paymentIntent.client_secret || '',
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        valor: paymentIntent.amount / 100,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error confirming payment intent: ${errorMsg}`);
      throw new Error(`Failed to confirm payment intent: ${errorMsg}`);
    }
  }

  /**
   * Registrar uma transação no banco de dados associada a um Payment Intent
   */
  static async createLocalTransaction(
    usuarioId: number,
    carteiraId: number,
    paymentIntentId: string,
    valor: number,
    descricao: string,
    categoriaId?: number,
    formaPagamentoId?: number
  ): Promise<number> {
    try {
      // Buscar forma de pagamento "Stripe" ou criar se não existir
      let fpId = formaPagamentoId;

      if (!fpId) {
        const stripeFp = await storage.query(
          `SELECT id FROM "formas_pagamento" WHERE nome = 'Stripe' AND global = true LIMIT 1`
        );

        if (stripeFp.rows.length > 0) {
          fpId = stripeFp.rows[0].id;
        } else {
          // Criar forma de pagamento "Stripe"
          const newFp = await storage.query(
            `INSERT INTO "formas_pagamento" (nome, descricao, icone, cor, global, ativo)
            VALUES ('Stripe', 'Pagamento via Stripe', 'CreditCard', '#0066CC', true, true)
            RETURNING id`
          );
          fpId = newFp.rows[0].id;
        }
      }

      // Criar transação com status "Pendente" (será atualizada pelo webhook)
      const result = await storage.query(
        `INSERT INTO "transacoes" 
        (carteira_id, categoria_id, forma_pagamento_id, tipo, valor, data_transacao, descricao, status, stripe_payment_id, gateway_status)
        VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, $7, $8, $9)
        RETURNING id`,
        [
          carteiraId,
          categoriaId,
          fpId,
          'Despesa',
          valor,
          descricao,
          'Pendente',
          paymentIntentId,
          'created',
        ]
      );

      const transacaoId = result.rows[0].id;
      console.log(
        `✅ Local transaction created: ${transacaoId} - Payment ID: ${paymentIntentId}`
      );

      return transacaoId;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error creating local transaction: ${errorMsg}`);
      throw new Error(`Failed to create local transaction: ${errorMsg}`);
    }
  }

  /**
   * Cancelar um Payment Intent
   */
  static async cancelPaymentIntent(paymentIntentId: string): Promise<void> {
    try {
      await stripe.paymentIntents.cancel(paymentIntentId);
      console.log(`✅ Payment intent canceled: ${paymentIntentId}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error canceling payment intent: ${errorMsg}`);
      throw new Error(`Failed to cancel payment intent: ${errorMsg}`);
    }
  }
}
