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
import { swaggerSpec } from './swagger/swaggerSpec';
import yaml from 'js-yaml';
import { handleAuth } from './handlers/authHandler';
import { authMiddleware } from './middleware/authMiddleware';
import { KVNamespace, ScheduledEvent, ExecutionContext } from '@cloudflare/workers-types';
import { Env } from './types/env';
import { roleMiddleware } from './middleware/roleMiddleware';

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        try {
            const kvService = new KVService({
                CUSTOMERS: env.CUSTOMERS,
                SUBSCRIPTIONS: env.SUBSCRIPTIONS,
                INVOICES: env.INVOICES,
                PAYMENTS: env.PAYMENTS,
            });
            const emailService = new EmailService(env.SENDGRID_API_KEY, env.FROM_EMAIL);

            const url = new URL(request.url);
            const path = url.pathname.split('/')[1];

            switch (path) {
                case 'auth':
                    return handleAuth(request, kvService, env);
                case 'api-docs':
                    return handleSwaggerUI(request);
                case 'swagger.yaml':
                    return new Response(yaml.dump(swaggerSpec), {
                        headers: { 'Content-Type': 'application/x-yaml' },
                    });
                default:
                    // Apply auth middleware for all other routes
                    const authResult = await authMiddleware(request, env);
                    if (authResult instanceof Response) {
                        return authResult; // This is the 401 response
                    }

                    switch (path) {
                        case 'subscription':
                            return handleSubscription(request, kvService);
                        case 'invoice':
                            return handleInvoice(request, kvService, emailService);
                        case 'customer':
                            return handleCustomer(request, kvService);
                        case 'plan':
                            return handleSubscriptionPlan(request, kvService);
                        case 'payment':
                            return handlePayment(request, kvService, emailService);
                        case 'billing':
                            return handleBilling(request, kvService, emailService);
                        default:
                            return new Response('Not found', { status: 404 });
                    }
            }
        } catch (error) {
            console.error('Unhandled error:', error);
            return new Response('Internal Server Error', { status: 500 });
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

function handleSwaggerUI(request: Request): Response {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Subscription Management API Documentation</title>
        <link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/3.52.0/swagger-ui.css">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/3.52.0/swagger-ui-bundle.js"></script>
    </head>
    <body>
        <div id="swagger-ui"></div>
        <script>
            window.onload = function() {
                SwaggerUIBundle({
                    url: "/swagger.yaml",
                    dom_id: '#swagger-ui',
                    presets: [
                        SwaggerUIBundle.presets.apis,
                        SwaggerUIBundle.SwaggerUIStandalonePreset
                    ],
                    layout: "BaseLayout"
                });
            }
        </script>
    </body>
    </html>
    `;

    return new Response(html, {
        headers: { 'Content-Type': 'text/html' },
    });
}

function handleSwaggerYAML(): Response {
    const yamlContent = yaml.dump(swaggerSpec);
    return new Response(yamlContent, {
        headers: { 'Content-Type': 'application/yaml' },
    });
}