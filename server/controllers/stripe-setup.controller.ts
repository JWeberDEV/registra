import type { Request, Response } from 'express';
import { StripeSetupService } from '../services/stripe-setup.service';

/**
 * Controller para endpoints de Setup Intents e cartões salvos
 */
export class StripeSetupController {
  /**
   * POST /api/payment-methods/setup-intent
   * Criar um Setup Intent para salvar cartão
   *
   * Body (opcional):
   * {
   *   descricao?: string
   * }
   */
  static async createSetupIntent(
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

      const { descricao } = req.body;

      const setupIntent = await StripeSetupService.createSetupIntent(
        usuarioId,
        email,
        descricao
      );

      return res.status(201).json(setupIntent);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Erro ao criar setup intent:', errorMsg);

      return res.status(500).json({
        erro: 'Erro ao criar setup intent',
        detalhes: errorMsg,
      });
    }
  }

  /**
   * POST /api/payment-methods/confirm-setup
   * Confirmar Setup Intent e salvar cartão
   *
   * Body:
   * {
   *   setup_intent_id: string,
   *   payment_method_id: string
   * }
   */
  static async confirmSetupIntent(
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

      const { setup_intent_id, payment_method_id } = req.body;

      if (!setup_intent_id || !payment_method_id) {
        return res.status(400).json({
          erro: 'setup_intent_id e payment_method_id são obrigatórios',
        });
      }

      const paymentMethod = await StripeSetupService.confirmSetupIntent(
        setup_intent_id,
        payment_method_id,
        usuarioId
      );

      return res.status(201).json(paymentMethod);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Erro ao confirmar setup intent:', errorMsg);

      return res.status(500).json({
        erro: 'Erro ao confirmar setup intent',
        detalhes: errorMsg,
      });
    }
  }

  /**
   * GET /api/payment-methods/saved
   * Listar cartões salvos do usuário
   */
  static async listPaymentMethods(
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

      const paymentMethods = await StripeSetupService.listPaymentMethods(
        usuarioId
      );

      return res.status(200).json(paymentMethods);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Erro ao listar cartões salvos:', errorMsg);

      return res.status(500).json({
        erro: 'Erro ao listar cartões salvos',
        detalhes: errorMsg,
      });
    }
  }

  /**
   * PUT /api/payment-methods/:paymentMethodId/default
   * Definir cartão como padrão
   */
  static async setDefaultPaymentMethod(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const usuarioId = req.user?.id;
      const { paymentMethodId } = req.params;

      if (!usuarioId) {
        return res.status(401).json({
          erro: 'Não autenticado',
        });
      }

      if (!paymentMethodId) {
        return res.status(400).json({
          erro: 'ID do método de pagamento é obrigatório',
        });
      }

      await StripeSetupService.setDefaultPaymentMethod(
        usuarioId,
        paymentMethodId
      );

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Cartão definido como padrão',
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Erro ao definir cartão como padrão:', errorMsg);

      return res.status(500).json({
        erro: 'Erro ao definir cartão como padrão',
        detalhes: errorMsg,
      });
    }
  }

  /**
   * DELETE /api/payment-methods/:paymentMethodId
   * Deletar um cartão salvo
   */
  static async deletePaymentMethod(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const usuarioId = req.user?.id;
      const { paymentMethodId } = req.params;

      if (!usuarioId) {
        return res.status(401).json({
          erro: 'Não autenticado',
        });
      }

      if (!paymentMethodId) {
        return res.status(400).json({
          erro: 'ID do método de pagamento é obrigatório',
        });
      }

      await StripeSetupService.deletePaymentMethod(
        usuarioId,
        paymentMethodId
      );

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Cartão removido',
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Erro ao deletar cartão:', errorMsg);

      return res.status(500).json({
        erro: 'Erro ao deletar cartão',
        detalhes: errorMsg,
      });
    }
  }

  /**
   * POST /api/payment-methods/charge-saved
   * Cobrar usando um cartão salvo
   *
   * Body:
   * {
   *   payment_method_id: string,
   *   valor: number,
   *   descricao: string
   * }
   */
  static async chargeWithSavedCard(
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

      const { payment_method_id, valor, descricao } = req.body;

      if (!payment_method_id || !valor || !descricao) {
        return res.status(400).json({
          erro: 'payment_method_id, valor e descricao são obrigatórios',
        });
      }

      const result = await StripeSetupService.chargeWithSavedCard(
        usuarioId,
        payment_method_id,
        valor,
        descricao
      );

      return res.status(201).json(result);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Erro ao cobrar com cartão salvo:', errorMsg);

      return res.status(500).json({
        erro: 'Erro ao cobrar com cartão salvo',
        detalhes: errorMsg,
      });
    }
  }
}
