import type { Request, Response } from 'express';
import { StripeBankSyncService } from '../services/stripe-financial-sync.service';

/**
 * Controller para gerenciar sincronização de contas bancárias
 * Permite conectar, desconectar e sincronizar contas bancárias
 */
export class StripeBankSyncController {
  /**
   * POST /api/bank/register
   * Registrar uma conta bancária conectada
   * Geralmente chamado após completar OAuth com o banco
   *
   * Body:
   * {
   *   stripe_account_id: string,
   *   status?: 'active' | 'pending'
   * }
   */
  static async registerAccount(
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

      const { stripe_account_id, status = 'pending' } = req.body;

      if (!stripe_account_id) {
        return res.status(400).json({
          erro: 'stripe_account_id é obrigatório',
        });
      }

      await StripeBankSyncService.registerConnectedAccount(
        usuarioId,
        stripe_account_id,
        status
      );

      return res.status(201).json({
        sucesso: true,
        mensagem: 'Conta bancária registrada',
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Erro ao registrar conta:', errorMsg);

      return res.status(500).json({
        erro: 'Erro ao registrar conta bancária',
        detalhes: errorMsg,
      });
    }
  }

  /**
   * GET /api/bank/connected
   * Obter status da conta bancária conectada
   */
  static async getConnectedStatus(
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

      const status = await StripeBankSyncService.getConnectedAccountStatus(
        usuarioId
      );

      return res.status(200).json(status);
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
   * POST /api/bank/sync
   * Sincronizar manualmente uma conta bancária
   *
   * Query params (opcional):
   * ?days_back=30  (número de dias para sincronizar, padrão: 30)
   */
  static async syncManually(
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

      const daysBack = req.query.days_back
        ? parseInt(req.query.days_back as string, 10)
        : 30;

      if (isNaN(daysBack) || daysBack < 1) {
        return res.status(400).json({
          erro: 'days_back deve ser um número maior que 0',
        });
      }

      const importedCount = await StripeBankSyncService.syncAccountManually(
        usuarioId,
        daysBack
      );

      return res.status(200).json({
        sucesso: true,
        mensagem: `${importedCount} transação(ões) importada(s)`,
        transacoes_importadas: importedCount,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Erro ao sincronizar:', errorMsg);

      return res.status(500).json({
        erro: 'Erro ao sincronizar conta bancária',
        detalhes: errorMsg,
      });
    }
  }

  /**
   * POST /api/bank/disconnect
   * Desconectar uma conta bancária
   */
  static async disconnectAccount(
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

      await StripeBankSyncService.disconnectAccount(usuarioId);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Conta bancária desconectada',
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Erro ao desconectar:', errorMsg);

      return res.status(500).json({
        erro: 'Erro ao desconectar conta bancária',
        detalhes: errorMsg,
      });
    }
  }
}
