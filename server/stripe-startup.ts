import { validateStripeConfig } from '../config/stripe';
import { StripeBankSyncService } from '../services/stripe-financial-sync.service';

/**
 * Inicializar configurações do Stripe na startup
 */
export async function initializeStripe(): Promise<void> {
  try {
    console.log('🔌 Inicializando Stripe...');

    // Validar que todas as variáveis de ambiente necessárias estão configuradas
    validateStripeConfig();
    console.log('✅ Variáveis de ambiente do Stripe validadas');

    // Inicializar scheduler de sincronização de contas bancárias
    StripeBankSyncService.initializeBankSyncScheduler();
    console.log('✅ Stripe inicializado com sucesso');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Erro ao inicializar Stripe: ${errorMsg}`);

    // Em produção, falhar se Stripe não estiver configurado
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }

    // Em desenvolvimento, apenas avisar
    console.warn(
      '⚠️ Stripe não está completamente configurado. Funcionalidades de pagamento estarão desativadas.'
    );
  }
}

/**
 * Limpar recursos do Stripe no shutdown
 */
export function cleanupStripe(): void {
  try {
    StripeBankSyncService.stopBankSyncScheduler();
    console.log('✅ Stripe cleanup completo');
  } catch (error) {
    console.error('❌ Erro no cleanup do Stripe:', error);
  }
}
