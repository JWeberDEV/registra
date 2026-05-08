import { stripe } from '../config/stripe';
import { storage } from '../storage';

/**
 * Service para gerenciar Stripe Connect (marketplace)
 * Permite que vendedores recebam pagamentos através da plataforma
 */
export class StripeConnectService {
  /**
   * Criar uma conta Connect (Express ou Standard)
   * Express é mais rápido, Standard oferece mais controle
   */
  static async createConnectedAccount(
    usuarioId: number,
    email: string,
    businessName: string,
    accountType: 'express' | 'standard' = 'express'
  ): Promise<string> {
    try {
      const account = await stripe.accounts.create({
        type: accountType,
        email,
        business_profile: {
          name: businessName,
          product_category: 'financial_services',
          url: `${process.env.BASE_URL || 'http://localhost:3000'}`,
        },
        metadata: {
          usuario_id: String(usuarioId),
          created_at: new Date().toISOString(),
        },
      });

      // Salvar no banco de dados
      await storage.query(
        `INSERT INTO "stripe_connected_accounts"
        (usuario_id, stripe_account_id, status)
        VALUES ($1, $2, $3)`,
        [usuarioId, account.id, 'pending']
      );

      console.log(
        `✅ Connected account created: ${account.id} (type: ${accountType})`
      );

      return account.id;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error creating connected account: ${errorMsg}`);
      throw new Error(`Failed to create connected account: ${errorMsg}`);
    }
  }

  /**
   * Gerar link de onboarding para completar setup da conta
   * O usuário será redirecionado para Stripe para completar verificação
   */
  static async generateAccountLink(
    stripeAccountId: string,
    returnUrl: string
  ): Promise<string> {
    try {
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        type: 'account_onboarding',
        return_url: returnUrl,
      });

      console.log(`✅ Account link generated: ${stripeAccountId}`);

      return accountLink.url;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error generating account link: ${errorMsg}`);
      throw new Error(`Failed to generate account link: ${errorMsg}`);
    }
  }

  /**
   * Obter status da conta Connect
   * Verifica se foi completado o onboarding e se está pronto para receber pagamentos
   */
  static async getAccountStatus(stripeAccountId: string): Promise<{
    id: string;
    status: string;
    charges_enabled: boolean;
    payouts_enabled: boolean;
    requirements?: {
      current_deadline?: number;
      eventually_due: string[];
      past_due: string[];
      currently_due: string[];
    };
  }> {
    try {
      const account = await stripe.accounts.retrieve(stripeAccountId);

      return {
        id: account.id,
        status: account.type,
        charges_enabled: account.charges_enabled || false,
        payouts_enabled: account.payouts_enabled || false,
        requirements: account.requirements
          ? {
              current_deadline: account.requirements.current_deadline,
              eventually_due: account.requirements.eventually_due || [],
              past_due: account.requirements.past_due || [],
              currently_due: account.requirements.currently_due || [],
            }
          : undefined,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error retrieving account status: ${errorMsg}`);
      throw new Error(`Failed to retrieve account status: ${errorMsg}`);
    }
  }

  /**
   * Criar um payment para uma conta conectada
   * Usado em marketplace: cliente paga, vendedor recebe com comissão
   */
  static async createChargeForConnectedAccount(
    stripeAccountId: string,
    stripeCustumerId: string,
    valor: number,
    descricao: string,
    comissaoPercentual: number = 10
  ): Promise<{
    paymentIntentId: string;
    status: string;
    valor_vendedor: number;
    valor_plataforma: number;
  }> {
    try {
      const amountCents = Math.round(valor * 100);
      const comissaoCents = Math.round(
        (amountCents * comissaoPercentual) / 100
      );
      const valorVendedorCents = amountCents - comissaoCents;

      // Criar payment intent que será capturado na conta conectada
      // Com application_fee_amount para comissão da plataforma
      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: amountCents,
          currency: 'brl',
          customer: stripeCustumerId,
          description: descricao,
          metadata: {
            stripe_account_id: stripeAccountId,
            comissao_percentual: String(comissaoPercentual),
          },
          application_fee_amount: comissaoCents,
        },
        {
          stripeAccount: stripeAccountId,
        }
      );

      console.log(
        `✅ Charge created for connected account: ${paymentIntent.id}`
      );

      return {
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        valor_vendedor: valorVendedorCents / 100,
        valor_plataforma: comissaoCents / 100,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error creating charge for connected account: ${errorMsg}`);
      throw new Error(`Failed to create charge: ${errorMsg}`);
    }
  }

  /**
   * Listar todas as contas conectadas de um usuário (geralmente 1)
   */
  static async getConnectedAccount(usuarioId: number): Promise<{
    stripe_account_id: string;
    status: string;
    charges_enabled: boolean;
  } | null> {
    try {
      const result = await storage.query(
        `SELECT stripe_account_id, status FROM "stripe_connected_accounts"
        WHERE usuario_id = $1 LIMIT 1`,
        [usuarioId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const account = result.rows[0];
      const status = await this.getAccountStatus(account.stripe_account_id);

      return {
        stripe_account_id: account.stripe_account_id,
        status: account.status,
        charges_enabled: status.charges_enabled,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error retrieving connected account: ${errorMsg}`);
      throw new Error(`Failed to retrieve connected account: ${errorMsg}`);
    }
  }

  /**
   * Atualizar status da conta no banco de dados
   * Chamado quando webhook reporta conta foi aprovada
   */
  static async updateAccountStatus(
    stripeAccountId: string,
    status: 'active' | 'pending' | 'disabled'
  ): Promise<void> {
    try {
      await storage.query(
        `UPDATE "stripe_connected_accounts"
        SET status = $1
        WHERE stripe_account_id = $2`,
        [status, stripeAccountId]
      );

      console.log(
        `✅ Account status updated: ${stripeAccountId} -> ${status}`
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error updating account status: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Calcular comissão e valor para vendedor
   */
  static calculateFeeAndPayout(
    valor: number,
    comissaoPercentual: number = 10
  ): {
    total: number;
    comissao: number;
    vendedor: number;
  } {
    const comissao = valor * (comissaoPercentual / 100);
    const vendedor = valor - comissao;

    return {
      total: valor,
      comissao: parseFloat(comissao.toFixed(2)),
      vendedor: parseFloat(vendedor.toFixed(2)),
    };
  }
}
