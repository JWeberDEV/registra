import { stripe } from '../config/stripe';
import type {
  CreateSetupIntentRequest,
  SetupIntentResponse,
  StripePaymentMethodRecord,
} from '../types/stripe.types';
import { storage } from '../storage';
import { StripePaymentService } from './stripe-payment.service';

/**
 * Service para gerenciar Setup Intents e cartões salvos
 * Permite salvar cartões para uso futuro em cobranças
 */
export class StripeSetupService {
  /**
   * Criar um Setup Intent para iniciar fluxo de salvamento de cartão
   */
  static async createSetupIntent(
    usuarioId: number,
    email: string,
    descricao?: string
  ): Promise<SetupIntentResponse> {
    try {
      // Criar ou obter Stripe customer
      const stripeCustumerId = await StripePaymentService.createOrUpdateCustomer(
        usuarioId,
        email
      );

      // Criar Setup Intent
      const setupIntent = await stripe.setupIntents.create({
        customer: stripeCustumerId,
        payment_method_types: ['card'],
        metadata: {
          usuario_id: String(usuarioId),
          descricao: descricao || 'Salvar cartão',
        },
      });

      console.log(`✅ Setup intent created: ${setupIntent.id}`);

      return {
        clientSecret: setupIntent.client_secret || '',
        setupIntentId: setupIntent.id,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error creating setup intent: ${errorMsg}`);
      throw new Error(`Failed to create setup intent: ${errorMsg}`);
    }
  }

  /**
   * Confirmar um Setup Intent e salvar o método de pagamento
   */
  static async confirmSetupIntent(
    setupIntentId: string,
    paymentMethodId: string,
    usuarioId: number
  ): Promise<StripePaymentMethodRecord> {
    try {
      // Confirmar setup intent
      const setupIntent = await stripe.setupIntents.confirm(setupIntentId, {
        payment_method: paymentMethodId,
      });

      if (setupIntent.status !== 'succeeded') {
        throw new Error(`Setup intent status: ${setupIntent.status}`);
      }

      // Obter detalhes do método de pagamento
      const paymentMethod = await stripe.paymentMethods.retrieve(
        paymentMethodId
      );

      if (!paymentMethod.card) {
        throw new Error('Payment method is not a card');
      }

      // Salvar no banco de dados
      const result = await storage.query(
        `INSERT INTO "stripe_payment_methods" 
        (usuario_id, stripe_payment_method_id, brand, last4, exp_month, exp_year, is_default)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, usuario_id, stripe_payment_method_id, brand, last4, exp_month, exp_year, is_default, data_criacao`,
        [
          usuarioId,
          paymentMethodId,
          paymentMethod.card.brand || 'unknown',
          paymentMethod.card.last4 || 'xxxx',
          paymentMethod.card.exp_month || 0,
          paymentMethod.card.exp_year || 0,
          false, // Não set como default por padrão
        ]
      );

      console.log(
        `✅ Payment method saved: ${paymentMethodId} (${paymentMethod.card.brand})`
      );

      return result.rows[0];
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error confirming setup intent: ${errorMsg}`);
      throw new Error(`Failed to confirm setup intent: ${errorMsg}`);
    }
  }

  /**
   * Listar métodos de pagamento salvos de um usuário
   */
  static async listPaymentMethods(
    usuarioId: number
  ): Promise<StripePaymentMethodRecord[]> {
    try {
      const result = await storage.query(
        `SELECT * FROM "stripe_payment_methods"
        WHERE usuario_id = $1
        ORDER BY is_default DESC, data_criacao DESC`,
        [usuarioId]
      );

      return result.rows;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error listing payment methods: ${errorMsg}`);
      throw new Error(`Failed to list payment methods: ${errorMsg}`);
    }
  }

  /**
   * Definir um método como default
   */
  static async setDefaultPaymentMethod(
    usuarioId: number,
    paymentMethodId: string
  ): Promise<void> {
    try {
      // Retirar default de todos os outros
      await storage.query(
        `UPDATE "stripe_payment_methods" SET is_default = false WHERE usuario_id = $1`,
        [usuarioId]
      );

      // Marcar como default
      await storage.query(
        `UPDATE "stripe_payment_methods" SET is_default = true 
        WHERE usuario_id = $1 AND stripe_payment_method_id = $2`,
        [usuarioId, paymentMethodId]
      );

      console.log(
        `✅ Payment method set as default: ${paymentMethodId}`
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error setting default payment method: ${errorMsg}`);
      throw new Error(`Failed to set default payment method: ${errorMsg}`);
    }
  }

  /**
   * Deletar um método de pagamento salvo
   */
  static async deletePaymentMethod(
    usuarioId: number,
    paymentMethodId: string
  ): Promise<void> {
    try {
      // Detach do Stripe
      await stripe.paymentMethods.detach(paymentMethodId);

      // Remover do banco de dados
      await storage.query(
        `DELETE FROM "stripe_payment_methods" 
        WHERE usuario_id = $1 AND stripe_payment_method_id = $2`,
        [usuarioId, paymentMethodId]
      );

      console.log(`✅ Payment method deleted: ${paymentMethodId}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error deleting payment method: ${errorMsg}`);
      throw new Error(`Failed to delete payment method: ${errorMsg}`);
    }
  }

  /**
   * Cobrar com um cartão salvo
   * Útil para renovações de assinatura ou pagamentos periódicos
   */
  static async chargeWithSavedCard(
    usuarioId: number,
    paymentMethodId: string,
    valor: number,
    descricao: string,
    metadados?: Record<string, string>
  ): Promise<{
    paymentIntentId: string;
    status: string;
  }> {
    try {
      // Obter Stripe customer ID
      const customer = await storage.query(
        `SELECT stripe_customer_id FROM "usuarios" WHERE id = $1`,
        [usuarioId]
      );

      if (customer.rows.length === 0) {
        throw new Error('User not found');
      }

      const stripeCustumerId = customer.rows[0].stripe_customer_id;

      if (!stripeCustumerId) {
        throw new Error('User has no Stripe customer ID');
      }

      // Criar payment intent com cartão salvo
      const amountCents = Math.round(valor * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'brl',
        customer: stripeCustumerId,
        payment_method: paymentMethodId,
        confirm: true,
        description: descricao,
        metadata: {
          usuario_id: String(usuarioId),
          ...metadados,
        },
      });

      console.log(
        `✅ Payment intent created with saved card: ${paymentIntent.id}`
      );

      return {
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error charging with saved card: ${errorMsg}`);
      throw new Error(`Failed to charge with saved card: ${errorMsg}`);
    }
  }
}
