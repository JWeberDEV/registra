import type { Request, Response } from 'express';
import { StripePaymentService } from '../services/stripe-payment.service';
import type {
  CreatePaymentIntentRequest,
  PaymentIntentResponse,
} from '../types/stripe.types';

/**
 * Controller para endpoints de Payment Intent
 * Endpoints para criar e gerenciar pagamentos únicos
 */
export class StripePaymentController {
  /**
   * POST /api/payments/intent
   * Criar um novo Payment Intent para pagamento
   *
   * Body:
   * {
   *   valor: number,                    // Valor em reais (ex: 99.90)
   *   descricao: string,                // Descrição do pagamento
   *   carteira_id?: number,             // ID da carteira
   *   categoria_id?: number,            // ID da categoria
   *   metadados?: Record<string, string> // Dados adicionais
   * }
   */
  static async createPaymentIntent(
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

      const {
        valor,
        descricao,
        carteira_id,
        categoria_id,
        metadados,
      } = req.body as CreatePaymentIntentRequest;

      // Validar inputs
      if (!valor || valor <= 0) {
        return res.status(400).json({
          erro: 'Valor deve ser maior que 0',
        });
      }

      if (!descricao || descricao.trim() === '') {
        return res.status(400).json({
          erro: 'Descrição é obrigatória',
        });
      }

      // Criar Payment Intent
      const paymentIntentResponse =
        await StripePaymentService.createPaymentIntent(
          usuarioId,
          valor,
          email,
          descricao,
          metadados
        );

      // Se fornecido, criar transação local
      if (carteira_id) {
        try {
          const transacaoId =
            await StripePaymentService.createLocalTransaction(
              usuarioId,
              carteira_id,
              paymentIntentResponse.paymentIntentId,
              valor,
              descricao,
              categoria_id
            );

          return res.status(201).json({
            ...paymentIntentResponse,
            transacao_id: transacaoId,
          });
        } catch (error) {
          // Se falhar criar transação local, ainda retornar o payment intent
          console.error('Erro ao criar transação local:', error);
          return res.status(201).json(paymentIntentResponse);
        }
      }

      return res.status(201).json(paymentIntentResponse);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Erro ao criar payment intent:', errorMsg);

      return res.status(500).json({
        erro: 'Erro ao criar pagamento',
        detalhes: errorMsg,
      });
    }
  }

  /**
   * GET /api/payments/:paymentIntentId/status
   * Obter status de um Payment Intent
   */
  static async getPaymentStatus(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { paymentIntentId } = req.params;

      if (!paymentIntentId) {
        return res.status(400).json({
          erro: 'Payment Intent ID é obrigatório',
        });
      }

      const status = await StripePaymentService.getPaymentIntentStatus(
        paymentIntentId
      );

      return res.status(200).json(status);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Erro ao obter status do pagamento:', errorMsg);

      return res.status(500).json({
        erro: 'Erro ao obter status do pagamento',
        detalhes: errorMsg,
      });
    }
  }

  /**
   * POST /api/payments/:paymentIntentId/confirm
   * Confirmar um Payment Intent (para 3D Secure)
   *
   * Body (opcional):
   * {
   *   payment_method_id?: string // ID do método de pagamento
   * }
   */
  static async confirmPaymentIntent(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { paymentIntentId } = req.params;
      const { payment_method_id } = req.body;

      if (!paymentIntentId) {
        return res.status(400).json({
          erro: 'Payment Intent ID é obrigatório',
        });
      }

      const confirmed =
        await StripePaymentService.confirmPaymentIntent(
          paymentIntentId,
          payment_method_id
        );

      return res.status(200).json(confirmed);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Erro ao confirmar pagamento:', errorMsg);

      return res.status(500).json({
        erro: 'Erro ao confirmar pagamento',
        detalhes: errorMsg,
      });
    }
  }

  /**
   * DELETE /api/payments/:paymentIntentId
   * Cancelar um Payment Intent
   */
  static async cancelPayment(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { paymentIntentId } = req.params;

      if (!paymentIntentId) {
        return res.status(400).json({
          erro: 'Payment Intent ID é obrigatório',
        });
      }

      await StripePaymentService.cancelPaymentIntent(paymentIntentId);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Pagamento cancelado',
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Erro ao cancelar pagamento:', errorMsg);

      return res.status(500).json({
        erro: 'Erro ao cancelar pagamento',
        detalhes: errorMsg,
      });
    }
  }
}
