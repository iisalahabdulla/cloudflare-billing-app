import { handleSubscription } from './handlers/subscriptionHandler';
import { handleInvoice } from './handlers/invoiceHandler';
import { handleCustomer } from './handlers/customerHandler';
import { handleSubscriptionPlan } from './handlers/subscriptionPlanHandler';
import { handlePayment } from './handlers/paymentHandler';
import { handleBilling } from './handlers/billingHandler';
import { handlePaymentRetry } from './handlers/paymentRetryHandler';
import { KVService } from './services/kvService';
import { EmailService } from './services/emailService';
import { handleError } from './utils/errorHandler';

export interface Env {
    CUSTOMERS: KVNamespace;
    SUBSCRIPTIONS: KVNamespace;
    INVOICES: KVNamespace;
    PAYMENTS: KVNamespace;
    SENDGRID_API_KEY: string;
    FROM_EMAIL: string;
}

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const kvService = new KVService({
            CUSTOMERS: env.CUSTOMERS,
            SUBSCRIPTIONS: env.SUBSCRIPTIONS,
            INVOICES: env.INVOICES,
            PAYMENTS: env.PAYMENTS,
        });
        
        // Use dummy email service for testing
        const emailService = new EmailService(env.SENDGRID_API_KEY, env.FROM_EMAIL);
        try {
            const url = new URL(request.url);
            const path = url.pathname.split('/').filter(Boolean);

            switch (path[0]) {
                case 'customer':
                    return handleCustomer(request, kvService);
                case 'subscription':
                    return handleSubscription(request, kvService);
                case 'invoice':
                    return handleInvoice(request, kvService, emailService);
                case 'subscription-plan':
                    return handleSubscriptionPlan(request, kvService);
                case 'payment':
                    return handlePayment(request, kvService, emailService);
                case 'billing':
                    return handleBilling(request, kvService, emailService);
                default:
                    return new Response('Not found', { status: 404 });
            }
        } catch (error) {
            return handleError(error);
        }
    },

    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
        try {
            const kvService = new KVService({
                CUSTOMERS: env.CUSTOMERS,
                SUBSCRIPTIONS: env.SUBSCRIPTIONS,
                INVOICES: env.INVOICES,
                PAYMENTS: env.PAYMENTS,
            });
            const emailService = new EmailService(env.SENDGRID_API_KEY, env.FROM_EMAIL);

            switch (event.cron) {
                case '0 0 * * *': // Daily at midnight UTC
                    await handleBilling(new Request('https://dummy-url/billing', { method: 'GET' }), kvService, emailService);
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