import { KVNamespace } from '@cloudflare/workers-types';

export interface Env {
    JWT_SECRET: string;
    CUSTOMERS: KVNamespace;
    SUBSCRIPTIONS: KVNamespace;
    INVOICES: KVNamespace;
    PAYMENTS: KVNamespace;
    SENDGRID_API_KEY: string;
    FROM_EMAIL: string;
}