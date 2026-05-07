import type { Request, Response } from 'express';
import { StripeEventService } from '../services/stripe-event.service';
import type {
  WebhookErrorResponse,
  WebhookSuccessResponse,
} from '../types/stripe.types';

/**
 * Controller para processar webhooks do Stripe
 * Nota: body raw é necessário para validação de assinatura
 */
export class StripeWebhookController {
  /**
   * POST /api/webhooks/stripe
   * Recebe e processa eventos do Stripe
   *
   * Retorna 200 OK imediatamente conforme requisito Stripe,
   * mas processa evento de forma síncrona
   */
  static async handleWebhook(
    req: Request,
    res: Response
  ): Promise<Response<WebhookSuccessResponse | WebhookErrorResponse>> {
    try {
      // Obter signature do header
      const signature = req.headers['stripe-signature'];

      if (!signature) {
        console.error('❌ Missing Stripe signature header');
        return res.status(400).json({
          erro: 'Missing stripe-signature header',
        });
      }

      // body já está como string (raw) do middleware
      const body =
        typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

      let event: Record<string, unknown>;

      try {
        // Validar assinatura e obter evento
        event = StripeEventService.validateWebhookSignature(
          body,
          signature as string
        );
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : String(error);
        console.error(`❌ Webhook signature validation failed: ${errorMsg}`);

        return res.status(401).json({
          erro: 'Invalid webhook signature',
          detalhes: errorMsg,
        });
      }

      console.log(`📨 Webhook received: ${event.type} (${event.id})`);

      // Responder 200 OK imediatamente (requisito Stripe)
      // Processamento pode levar tempo, Stripe não espera
      res.status(200).json({
        sucesso: true,
        mensagem: 'Webhook received',
        eventId: event.id as string,
      });

      // Processar evento de forma síncrona
      // Erros aqui não serão retornados ao Stripe, mas serão logados
      await this.processEvent(event);

      return res;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Webhook handler error: ${errorMsg}`);

      return res.status(500).json({
        erro: 'Internal server error',
        detalhes: errorMsg,
      });
    }
  }

  /**
   * Processar evento do Stripe baseado no tipo
   */
  private static async processEvent(
    event: Record<string, unknown>
  ): Promise<void> {
    const eventType = event.type as string;
    const eventData = event.data?.object;

    if (!eventData) {
      console.warn('⚠️ No data object in webhook event');
      return;
    }

    try {
      switch (eventType) {
        // Payment Intent events
        case 'payment_intent.succeeded':
          await StripeEventService.handlePaymentIntentSucceeded(
            eventData as Record<string, unknown>
          );
          break;

        case 'payment_intent.payment_failed':
          await StripeEventService.handlePaymentIntentPaymentFailed(
            eventData as Record<string, unknown>
          );
          break;

        // Subscription events
        case 'customer.subscription.created':
          await StripeEventService.handleCustomerSubscriptionCreated(
            eventData as Record<string, unknown>
          );
          break;

        case 'customer.subscription.deleted':
          await StripeEventService.handleCustomerSubscriptionDeleted(
            eventData as Record<string, unknown>
          );
          break;

        // Refund events
        case 'charge.refunded':
          await StripeEventService.handleChargeRefunded(
            eventData as Record<string, unknown>
          );
          break;

        default:
          console.log(
            `ℹ️ Unhandled webhook event type: ${eventType} - logging only`
          );
          // Log outros eventos sem fazer nada
          await StripeEventService.logWebhookEvent(
            event.id as string,
            eventType,
            undefined,
            undefined,
            eventData as Record<string, unknown>
          );
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error processing event ${eventType}: ${errorMsg}`);

      // Log error para auditoria
      await StripeEventService.logWebhookEvent(
        event.id as string,
        eventType,
        undefined,
        undefined,
        eventData as Record<string, unknown>,
        errorMsg
      );

      // Re-throw para que o caller saiba que houve erro
      throw error;
    }
  }
}
