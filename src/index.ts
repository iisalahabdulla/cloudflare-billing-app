import { handleSubscription } from './handlers/subscriptionHandler';
import { handleInvoice } from './handlers/invoiceHandler';
import { handleCustomer } from './handlers/customerHandler';
import { handleSubscriptionPlan } from './handlers/subscriptionPlanHandler';
import { handlePayment } from './handlers/paymentHandler';
import { handleBilling } from './handlers/billingHandler';
import { handlePaymentRetry } from './handlers/paymentRetryHandler';
import { KVService } from './services/kvService';
import { EmailService } from './services/emailService';
import { BillingDO } from './durable_objects/BillingDO';
import { handleError } from './utils/errorHandler';

export interface Env {
  CUSTOMERS: KVNamespace;
  SUBSCRIPTIONS: KVNamespace;
  INVOICES: KVNamespace;
  PAYMENTS: KVNamespace;
  SENDGRID_API_KEY: string;
  FROM_EMAIL: string;
  BILLING_DO: DurableObjectNamespace;
}

export { BillingDO };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);
      const kvService = new KVService(env);
      const emailService = new EmailService(env.SENDGRID_API_KEY, env.FROM_EMAIL);

      if (url.pathname.startsWith('/billing-do/')) {
        return handleBillingDO(request, env);
      }

      switch (url.pathname) {
        case '/subscription':
          return handleSubscription(request, kvService);
        case '/invoice':
          return handleInvoice(request, kvService, emailService);
        case '/customer':
          return handleCustomer(request, kvService, env.BILLING_DO);
        case '/subscription-plan':
          return handleSubscriptionPlan(request, kvService);
        case '/payment':
          return handlePayment(request, kvService, emailService);
        case '/billing':
          return handleBilling(request, kvService, emailService, env.BILLING_DO);
        case '/payment-retry':
          return handlePaymentRetry(kvService, emailService);
        default:
          return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      return handleError(error);
    }
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    try {
      const kvService = new KVService(env);
      const emailService = new EmailService(env.SENDGRID_API_KEY, env.FROM_EMAIL);

      switch (event.cron) {
        case '0 0 * * *': // Daily at midnight UTC
          await handleBilling(new Request('https://dummy-url/billing', { method: 'GET' }), kvService, emailService, env.BILLING_DO);
          break;
        case '0 */4 * * *': // Every 4 hours
          await handlePaymentRetry(kvService, emailService);
          break;
      }
    } catch (error) {
      console.error('Scheduled task error:', error);
    }
  }
};

async function handleBillingDO(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const customerId = url.pathname.split('/')[2];
    const id = env.BILLING_DO.idFromName(customerId);
    const obj = env.BILLING_DO.get(id);
    return obj.fetch(request);
  } catch (error) {
    return handleError(error);
  }
}