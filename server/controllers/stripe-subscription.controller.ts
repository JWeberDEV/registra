import type { Request, Response } from 'express';
import { StripeSubscriptionService } from '../services/stripe-subscription.service';

/**
 * Controller para endpoints de Subscriptions
 * Gerencia assinaturas e pagamentos recorrentes
 */
export class StripeSubscriptionController {
  /**
   * POST /api/subscriptions/create
   * Criar uma nova assinatura
   *
   * Body:
   * {
   *   stripe_price_id: string,       // ID do price no Stripe
   *   metadados?: Record<string, string>,
   *   descricao?: string
   * }
   */
  static async createSubscription(
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

      const { stripe_price_id, metadados, descricao } = req.body;

      if (!stripe_price_id) {
        return res.status(400).json({
          erro: 'stripe_price_id é obrigatório',
        });
      }

      const subscription = await StripeSubscriptionService.createSubscription(
        usuarioId,
        email,
        stripe_price_id,
        metadados,
        descricao
      );

      return res.status(201).json(subscription);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Erro ao criar assinatura:', errorMsg);

      return res.status(500).json({
        erro: 'Erro ao criar assinatura',
        detalhes: errorMsg,
      });
    }
  }

  /**
   * GET /api/subscriptions
   * Listar todas as assinaturas do usuário
   */
  static async listSubscriptions(
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

      const subscriptions = await StripeSubscriptionService.listSubscriptions(
        usuarioId
      );

      return res.status(200).json(subscriptions);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Erro ao listar assinaturas:', errorMsg);

      return res.status(500).json({
        erro: 'Erro ao listar assinaturas',
        detalhes: errorMsg,
      });
    }
  }

  /**
   * GET /api/subscriptions/:subscriptionId
   * Obter detalhes de uma assinatura específica
   */
  static async getSubscription(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { subscriptionId } = req.params;

      if (!subscriptionId) {
        return res.status(400).json({
          erro: 'ID de assinatura é obrigatório',
        });
      }

      const subscription = await StripeSubscriptionService.getSubscription(
        subscriptionId
      );

      return res.status(200).json(subscription);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Erro ao obter assinatura:', errorMsg);

      return res.status(500).json({
        erro: 'Erro ao obter assinatura',
        detalhes: errorMsg,
      });
    }
  }

  /**
   * PUT /api/subscriptions/:subscriptionId/plan
   * Atualizar o plano de uma assinatura
   *
   * Body:
   * {
   *   stripe_price_id: string,      // Novo price ID
   *   proration?: 'create_prorations' | 'none'
   * }
   */
  static async updatePlan(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { subscriptionId } = req.params;
      const { stripe_price_id, proration = 'create_prorations' } = req.body;

      if (!subscriptionId) {
        return res.status(400).json({
          erro: 'ID de assinatura é obrigatório',
        });
      }

      if (!stripe_price_id) {
        return res.status(400).json({
          erro: 'stripe_price_id é obrigatório',
        });
      }

      const updated = await StripeSubscriptionService.updateSubscriptionPlan(
        subscriptionId,
        stripe_price_id,
        proration as 'create_prorations' | 'none'
      );

      return res.status(200).json(updated);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Erro ao atualizar plano:', errorMsg);

      return res.status(500).json({
        erro: 'Erro ao atualizar plano',
        detalhes: errorMsg,
      });
    }
  }

  /**
   * DELETE /api/subscriptions/:subscriptionId
   * Cancelar uma assinatura
   *
   * Query params:
   * ?at_period_end=true (default) - cancelar ao final do período
   * ?at_period_end=false - cancelar imediatamente
   */
  static async cancelSubscription(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { subscriptionId } = req.params;
      const atPeriodEnd =
        req.query.at_period_end !== 'false';

      if (!subscriptionId) {
        return res.status(400).json({
          erro: 'ID de assinatura é obrigatório',
        });
      }

      await StripeSubscriptionService.cancelSubscription(
        subscriptionId,
        atPeriodEnd
      );

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Assinatura cancelada',
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Erro ao cancelar assinatura:', errorMsg);

      return res.status(500).json({
        erro: 'Erro ao cancelar assinatura',
        detalhes: errorMsg,
      });
    }
  }

  /**
   * POST /api/subscriptions/:subscriptionId/resume
   * Reativar uma assinatura cancelada
   */
  static async resumeSubscription(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { subscriptionId } = req.params;

      if (!subscriptionId) {
        return res.status(400).json({
          erro: 'ID de assinatura é obrigatório',
        });
      }

      const subscription = await StripeSubscriptionService.resumeSubscription(
        subscriptionId
      );

      return res.status(200).json(subscription);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Erro ao reativar assinatura:', errorMsg);

      return res.status(500).json({
        erro: 'Erro ao reativar assinatura',
        detalhes: errorMsg,
      });
    }
  }
}
