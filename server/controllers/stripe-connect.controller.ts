import type { Request, Response } from 'express';
import { StripeConnectService } from '../services/stripe-connect.service';

/**
 * Controller para Stripe Connect (marketplace)
 * Gerencia contas de vendedores que recebem pagamentos
 */
export class StripeConnectController {
  /**
   * POST /api/connect/create
   * Criar uma nova conta Connect para vendedor
   *
   * Body:
   * {
   *   business_name: string,
   *   account_type?: 'express' | 'standard'  (padrão: express)
   * }
   */
  static async createAccount(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const usuarioId = req.user?.id;
      const email = req.user?.email;

      if (!usuarioId || !email) {
        return res.status(401).json({
          erro: 'Não autenticado',
        });
      }

      const { business_name, account_type = 'express' } = req.body;

      if (!business_name) {
        return res.status(400).json({
          erro: 'business_name é obrigatório',
        });
      }

      const stripeAccountId = await StripeConnectService.createConnectedAccount(
        usuarioId,
        email,
        business_name,
        account_type
      );

      return res.status(201).json({
        sucesso: true,
        stripe_account_id: stripeAccountId,
        mensagem: 'Conta Connect criada. Complete o onboarding para começar a receber pagamentos.',
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Erro ao criar conta Connect:', errorMsg);

      return res.status(500).json({
        erro: 'Erro ao criar conta Connect',
        detalhes: errorMsg,
      });
    }
  }

  /**
   * GET /api/connect/onboarding-link
   * Gerar link de onboarding para completar setup
   *
   * Query params:
   * ?return_url=https://seu-app.com/connect/sucesso
   */
  static async generateOnboardingLink(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const usuarioId = req.user?.id;

      if (!usuarioId) {
        return res.status(401).json({
          erro: 'Não autenticado',
        });
      }

      const { return_url } = req.query;

      if (!return_url) {
        return res.status(400).json({
          erro: 'return_url é obrigatório',
        });
      }

      const account = await StripeConnectService.getConnectedAccount(usuarioId);

      if (!account) {
        return res.status(404).json({
          erro: 'Conta Connect não encontrada. Crie uma primeiro.',
        });
      }

      const onboardingUrl = await StripeConnectService.generateAccountLink(
        account.stripe_account_id,
        return_url as string
      );

      return res.status(200).json({
        sucesso: true,
        onboarding_url: onboardingUrl,
        mensagem: 'Link de onboarding gerado. Redirecionar usuário para completar setup.',
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Erro ao gerar link de onboarding:', errorMsg);

      return res.status(500).json({
        erro: 'Erro ao gerar link de onboarding',
        detalhes: errorMsg,
      });
    }
  }

  /**
   * GET /api/connect/status
   * Obter status da conta Connect
   */
  static async getStatus(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const usuarioId = req.user?.id;

      if (!usuarioId) {
        return res.status(401).json({
          erro: 'Não autenticado',
        });
      }

      const account = await StripeConnectService.getConnectedAccount(usuarioId);

      if (!account) {
        return res.status(404).json({
          erro: 'Conta Connect não encontrada',
        });
      }

      const fullStatus = await StripeConnectService.getAccountStatus(
        account.stripe_account_id
      );

      return res.status(200).json({
        stripe_account_id: account.stripe_account_id,
        status: account.status,
        pronto_para_pagamentos: fullStatus.charges_enabled && fullStatus.payouts_enabled,
        charges_enabled: fullStatus.charges_enabled,
        payouts_enabled: fullStatus.payouts_enabled,
        requirements: fullStatus.requirements,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Erro ao obter status:', errorMsg);

      return res.status(500).json({
        erro: 'Erro ao obter status da conta',
        detalhes: errorMsg,
      });
    }
  }

  /**
   * POST /api/connect/calculate-fee
   * Calcular comissão para uma transação
   *
   * Body:
   * {
   *   valor: number,
   *   comissao_percentual?: number  (padrão: 10)
   * }
   */
  static async calculateFee(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { valor, comissao_percentual = 10 } = req.body;

      if (!valor || valor <= 0) {
        return res.status(400).json({
          erro: 'valor deve ser maior que 0',
        });
      }

      const resultado = StripeConnectService.calculateFeeAndPayout(
        valor,
        comissao_percentual
      );

      return res.status(200).json(resultado);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Erro ao calcular comissão:', errorMsg);

      return res.status(500).json({
        erro: 'Erro ao calcular comissão',
        detalhes: errorMsg,
      });
    }
  }
}
