import { stripe } from '../config/stripe';
import { storage } from '../storage';
import cron from 'node-cron';

/**
 * Service para sincronizar transações bancárias via Stripe Financials API
 * Permite que usuários conectem suas contas bancárias e importem extratos automaticamente
 */
export class StripeBankSyncService {
  private static syncScheduler: NodeJS.Timeout | null = null;

  /**
   * Inicializar sincronização periódica de contas bancárias
   * Executa a cada 6 horas automaticamente
   */
  static initializeBankSyncScheduler(): void {
    if (this.syncScheduler) {
      console.log('⚠️ Bank sync scheduler already initialized');
      return;
    }

    // Executar a cada 6 horas (0 */6 * * *)
    this.syncScheduler = cron.schedule('0 */6 * * *', async () => {
      console.log('🔄 Starting scheduled bank sync...');
      try {
        await this.syncAllConnectedAccounts();
      } catch (error) {
        console.error('❌ Error in scheduled bank sync:', error);
      }
    });

    console.log('✅ Bank sync scheduler initialized (every 6 hours)');
  }

  /**
   * Parar o scheduler de sincronização
   */
  static stopBankSyncScheduler(): void {
    if (this.syncScheduler) {
      this.syncScheduler.stop();
      this.syncScheduler = null;
      console.log('⏹️ Bank sync scheduler stopped');
    }
  }

  /**
   * Sincronizar todas as contas conectadas dos usuários
   */
  static async syncAllConnectedAccounts(): Promise<void> {
    try {
      // Buscar todas as contas conectadas ativas
      const result = await storage.query(
        `SELECT id, usuario_id, stripe_account_id FROM "stripe_connected_accounts"
        WHERE status = 'active'`
      );

      console.log(
        `🔄 Syncing ${result.rows.length} connected accounts...`
      );

      for (const account of result.rows) {
        try {
          await this.syncAccountTransactions(account.usuario_id, account.stripe_account_id);
        } catch (error) {
          console.error(
            `❌ Error syncing account for user ${account.usuario_id}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error('❌ Error fetching connected accounts:', error);
      throw error;
    }
  }

  /**
   * Sincronizar transações de uma conta específica
   * Busca transações recentes e importa para o banco local
   */
  static async syncAccountTransactions(
    usuarioId: number,
    stripeAccountId: string,
    daysBack: number = 30
  ): Promise<number> {
    try {
      // Calcular data de início (últimos N dias)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      const startTimestamp = Math.floor(startDate.getTime() / 1000);

      // Buscar transações da conta conectada
      // Nota: Isto é um exemplo. A Stripe Financials API pode ter mudanças
      // Consulte a documentação atual da Stripe para detalhes completos
      const transactions = await this.fetchAccountTransactions(
        stripeAccountId,
        startTimestamp
      );

      console.log(
        `📥 Found ${transactions.length} transactions for sync (user: ${usuarioId})`
      );

      let importedCount = 0;

      for (const transaction of transactions) {
        try {
          const imported = await this.importTransaction(usuarioId, transaction);
          if (imported) {
            importedCount++;
          }
        } catch (error) {
          console.warn(
            `⚠️ Error importing transaction ${transaction.id}:`,
            error
          );
        }
      }

      // Atualizar último sync
      await storage.query(
        `UPDATE "stripe_connected_accounts" 
        SET ultimo_sync = NOW()
        WHERE stripe_account_id = $1`,
        [stripeAccountId]
      );

      console.log(`✅ Imported ${importedCount} transactions for user ${usuarioId}`);
      return importedCount;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error syncing account transactions: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Buscar transações da Stripe Financials API
   * Nota: Implementação simplificada. Consultar documentação Stripe atual.
   */
  private static async fetchAccountTransactions(
    stripeAccountId: string,
    createdAfter: number
  ): Promise<Array<Record<string, unknown>>> {
    try {
      // Exemplo usando Stripe API
      // A Financials API pode ter diferentes endpoints dependendo da versão
      // Esta é uma implementação genérica
      const transactions: Array<Record<string, unknown>> = [];

      // Nota: Adjust baseado na documentação Stripe atual
      // Este é um exemplo que pode precisar de ajustes
      console.log(
        `📡 Fetching transactions for account ${stripeAccountId} (created after: ${createdAfter})`
      );

      // Em produção, usar endpoint específico da Financials API
      // const response = await stripe.financialConnections.accounts.list({...})

      // Por enquanto, retorna array vazio como placeholder
      return transactions;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error fetching account transactions: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Importar uma transação bancária para o sistema local
   * Cria uma nova transação no banco de dados
   */
  private static async importTransaction(
    usuarioId: number,
    transaction: Record<string, unknown>
  ): Promise<boolean> {
    try {
      const stripeTransactionId = transaction.id as string;

      // Verificar se já foi importada
      const existing = await storage.query(
        `SELECT id FROM "stripe_financial_transactions" 
        WHERE stripe_transaction_id = $1`,
        [stripeTransactionId]
      );

      if (existing.rows.length > 0) {
        console.log(`⏭️ Transaction already imported: ${stripeTransactionId}`);
        return false;
      }

      // Buscar carteira padrão do usuário
      const walletResult = await storage.query(
        `SELECT id FROM "carteiras" WHERE usuario_id = $1 LIMIT 1`,
        [usuarioId]
      );

      if (walletResult.rows.length === 0) {
        console.warn(`⚠️ No wallet found for user ${usuarioId}`);
        return false;
      }

      const carteiraId = walletResult.rows[0].id;

      // Converter tipo de transação
      const tipo = (transaction.type as string) === 'debit' ? 'Despesa' : 'Receita';
      const valor = Math.abs((transaction.amount as number) / 100); // Converter de centavos

      // Criar transação local
      const result = await storage.query(
        `INSERT INTO "stripe_financial_transactions"
        (usuario_id, stripe_transaction_id, tipo, valor, descricao, data_movimento)
        VALUES ($1, $2, $3, $4, $5, to_date($6, 'YYYY-MM-DD'))
        RETURNING id`,
        [
          usuarioId,
          stripeTransactionId,
          tipo,
          valor,
          transaction.description || 'Importado via Stripe',
          new Date((transaction.created as number) * 1000).toISOString().split('T')[0],
        ]
      );

      const transacaoId = result.rows[0].id;

      console.log(
        `✅ Transaction imported: ${stripeTransactionId} -> Local ID: ${transacaoId}`
      );

      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error importing transaction: ${errorMsg}`);
      return false;
    }
  }

  /**
   * Sincronizar manualmente uma conta (endpoint manual)
   */
  static async syncAccountManually(
    usuarioId: number,
    daysBack?: number
  ): Promise<number> {
    try {
      // Buscar stripe_account_id do usuário
      const result = await storage.query(
        `SELECT stripe_account_id FROM "stripe_connected_accounts"
        WHERE usuario_id = $1 AND status = 'active'`,
        [usuarioId]
      );

      if (result.rows.length === 0) {
        throw new Error('No active connected account found for user');
      }

      const stripeAccountId = result.rows[0].stripe_account_id;

      return await this.syncAccountTransactions(
        usuarioId,
        stripeAccountId,
        daysBack
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error in manual sync: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Registrar uma conta bancária conectada
   * Geralmente chamado após OAuth completion
   */
  static async registerConnectedAccount(
    usuarioId: number,
    stripeAccountId: string,
    status: 'active' | 'pending' | 'disabled' = 'pending'
  ): Promise<void> {
    try {
      await storage.query(
        `INSERT INTO "stripe_connected_accounts"
        (usuario_id, stripe_account_id, status)
        VALUES ($1, $2, $3)
        ON CONFLICT (usuario_id) DO UPDATE SET
          stripe_account_id = $2,
          status = $3`,
        [usuarioId, stripeAccountId, status]
      );

      console.log(
        `✅ Connected account registered: ${stripeAccountId} (status: ${status})`
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error registering connected account: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Desconectar uma conta bancária
   */
  static async disconnectAccount(usuarioId: number): Promise<void> {
    try {
      await storage.query(
        `UPDATE "stripe_connected_accounts" 
        SET status = 'disabled'
        WHERE usuario_id = $1`,
        [usuarioId]
      );

      console.log(`✅ Account disconnected for user ${usuarioId}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error disconnecting account: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Obter status de uma conta conectada
   */
  static async getConnectedAccountStatus(
    usuarioId: number
  ): Promise<{
    connected: boolean;
    status?: string;
    lastSync?: Date;
  }> {
    try {
      const result = await storage.query(
        `SELECT status, ultimo_sync FROM "stripe_connected_accounts"
        WHERE usuario_id = $1`,
        [usuarioId]
      );

      if (result.rows.length === 0) {
        return { connected: false };
      }

      return {
        connected: true,
        status: result.rows[0].status,
        lastSync: result.rows[0].ultimo_sync
          ? new Date(result.rows[0].ultimo_sync)
          : undefined,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error getting account status: ${errorMsg}`);
      throw error;
    }
  }
}
