import { Customer } from '../models/customer';
import { SubscriptionPlan } from '../models/subscriptionPlan';
import { Invoice } from '../models/invoice';
import { Payment } from '../models/payment';

interface KVNamespaces {
    CUSTOMERS: KVNamespace;
    SUBSCRIPTIONS: KVNamespace;
    INVOICES: KVNamespace;
    PAYMENTS: KVNamespace;
}

export class KVService {
    private namespaces: KVNamespaces;

    constructor(namespaces: KVNamespaces) {
        this.namespaces = namespaces;
    }

    async getCustomer(id: string): Promise<Customer | null> {
        const data = await this.namespaces.CUSTOMERS.get(id);
        return data ? JSON.parse(data) : null;
    }

    async setCustomer(customer: Customer): Promise<void> {
        await this.namespaces.CUSTOMERS.put(customer.id, JSON.stringify(customer));
    }

    async getSubscription(id: string): Promise<any> {
        return JSON.parse(await this.namespaces.SUBSCRIPTIONS.get(id) || 'null');
    }

    async setSubscription(id: string, data: any): Promise<void> {
        await this.namespaces.SUBSCRIPTIONS.put(id, JSON.stringify(data));
    }

    async getInvoice(id: string): Promise<Invoice | null> {
        const data = await this.namespaces.INVOICES.get(id);
        return data ? JSON.parse(data) : null;
    }

    async setInvoice(invoice: Invoice): Promise<void> {
        await this.namespaces.INVOICES.put(invoice.id, JSON.stringify(invoice));
    }

    async getPayment(id: string): Promise<Payment | null> {
        const data = await this.namespaces.PAYMENTS.get(id);
        return data ? JSON.parse(data) : null;
    }

    async setPayment(payment: Payment): Promise<void> {
        await this.namespaces.PAYMENTS.put(payment.id, JSON.stringify(payment));
    }

    async getSubscriptionPlan(id: string): Promise<SubscriptionPlan | null> {
        const data = await this.namespaces.SUBSCRIPTIONS.get(id);
        return data ? JSON.parse(data) : null;
    }

    async setSubscriptionPlan(plan: SubscriptionPlan): Promise<void> {
        await this.namespaces.SUBSCRIPTIONS.put(plan.id, JSON.stringify(plan));
    }

    async listSubscriptionPlans(limit: number = 10, cursor?: string): Promise<{ plans: SubscriptionPlan[], cursor: string | undefined }> {
        const list = await this.namespaces.SUBSCRIPTIONS.list({ limit, cursor });
        const plans: SubscriptionPlan[] = [];
        let lastCursor;
        for (const key of list.keys) {
            const plan = await this.getSubscriptionPlan(key.name);
            if (plan) {
                plans.push(plan);
                lastCursor = key.name;
            }
        }
        return { plans, cursor: lastCursor };
    }

    async deleteSubscriptionPlan(id: string): Promise<void> {
        await this.namespaces.SUBSCRIPTIONS.delete(id);
    }

    async listInvoices(customerId?: string, limit: number = 10, cursor?: string): Promise<{ invoices: Invoice[], cursor: string | undefined }> {
        const list = await this.namespaces.INVOICES.list({ limit, cursor });
        const invoices: Invoice[] = [];
        let lastCursor;
        for (const key of list.keys) {
            const invoice = await this.getInvoice(key.name);
            if (invoice && (!customerId || invoice.customer_id === customerId)) {
                invoices.push(invoice);
            }
            lastCursor = key.name;
        }
        return { invoices, cursor: lastCursor };
    }

    async listAllInvoices(limit: number = 10, offset: number = 0): Promise<{ invoices: Invoice[], cursor: string | undefined }> {
        const list = await this.namespaces.INVOICES.list({
            limit: limit,
            cursor: offset.toString()
        });
        console.log({ list });
        const invoices: Invoice[] = [];
        let lastCursor;
        for (const key of list.keys) {
            const invoice = await this.getInvoice(key.name);
            if (invoice) invoices.push(invoice);
            lastCursor = key.name;
        }
        return { invoices, cursor: lastCursor };
    }

    async listCustomers(limit: number = 10, cursor?: string): Promise<{ customers: Customer[], cursor: string | undefined }> {
        const list = await this.namespaces.CUSTOMERS.list({ limit, cursor });
        const customers: Customer[] = [];
        let lastCursor;
        for (const key of list.keys) {
            const customer = await this.getCustomer(key.name);
            if (customer) {
                customers.push(customer);
                lastCursor = key.name;
            }
        }
        return { customers, cursor: lastCursor };
    }

    calculateSubscriptionEndDate(billingCycle: SubscriptionPlan['billing_cycle'], startDate: string = new Date().toISOString()): string {
        const date = new Date(startDate);
        switch (billingCycle) {
            case 'monthly':
                date.setMonth(date.getMonth() + 1);
                break;
            case 'quarterly':
                date.setMonth(date.getMonth() + 3);
                break;
            case 'yearly':
                date.setFullYear(date.getFullYear() + 1);
                break;
        }
        return date.toISOString();
    }

    async changePlan(customerId: string, newPlanId: string): Promise<void> {
        const customer = await this.getCustomer(customerId);
        if (!customer) {
            throw new Error('Customer not found');
        }

        const newPlan = await this.getSubscriptionPlan(newPlanId);
        const oldPlan = customer.subscription_plan_id ? await this.getSubscriptionPlan(customer.subscription_plan_id) : null;

        if (!newPlan) {
            throw new Error('New plan not found');
        }

        const now = new Date();
        const oldEndDate = new Date(customer.subscription_end_date || now);
        const daysLeft = (oldEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        const totalDays = this.getDaysInBillingCycle(oldPlan?.billing_cycle || newPlan.billing_cycle);

        // Calculate prorated refund for the old plan
        let proratedRefund = 0;
        if (oldPlan) {
            proratedRefund = (oldPlan.price / totalDays) * daysLeft;
        }

        // Calculate prorated charge for the new plan
        const proratedCharge = (newPlan.price / totalDays) * daysLeft;

        // Create an invoice for the plan change
        const invoice: Invoice = {
            id: `INV-CHANGE-${Date.now()}-${customer.id}`,
            customer_id: customer.id,
            amount: proratedCharge - proratedRefund,
            due_date: now.toISOString(),
            payment_status: 'pending',
            payment_date: null,
        };

        await this.setInvoice(invoice);

        // Update customer's subscription
        customer.subscription_plan_id = newPlanId;
        customer.subscription_start_date = now.toISOString();
        customer.subscription_end_date = this.calculateSubscriptionEndDate(newPlan.billing_cycle, now.toISOString());

        await this.setCustomer(customer);
    }

    private getDaysInBillingCycle(billingCycle: SubscriptionPlan['billing_cycle']): number {
        switch (billingCycle) {
            case 'monthly':
                return 30;
            case 'quarterly':
                return 90;
            case 'yearly':
                return 365;
            default:
                return 30;
        }
    }

    async listPayments(status?: Payment['status'], limit: number = 10, cursor?: string): Promise<{ payments: Payment[], cursor: string | undefined }> {
        const list = await this.namespaces.PAYMENTS.list({ limit, cursor });
        const payments: Payment[] = [];
        let lastCursor;
        for (const key of list.keys) {
            const payment = await this.getPayment(key.name);
            if (payment && (!status || payment.status === status)) {
                payments.push(payment);
                lastCursor = key.name;
            }
        }
        return { payments, cursor: lastCursor };
    }

    async assignSubscriptionPlan(customerId: string, planId: string): Promise<void> {
        const customer = await this.getCustomer(customerId);
        const plan = await this.getSubscriptionPlan(planId);

        if (!customer) {
            throw new Error('Customer not found');
        }
        if (!plan) {
            throw new Error('Subscription plan not found');
        }

        customer.subscription_plan_id = planId;
        customer.subscription_status = 'active';
        customer.subscription_start_date = new Date().toISOString();
        customer.subscription_end_date = this.calculateSubscriptionEndDate(plan.billing_cycle);

        await this.setCustomer(customer);
    }

    async updateSubscriptionStatus(customerId: string, status: Customer['subscription_status']): Promise<void> {
        const customer = await this.getCustomer(customerId);

        if (!customer) {
            throw new Error('Customer not found');
        }

        customer.subscription_status = status;
        if (status === 'cancelled') {
            customer.subscription_end_date = new Date().toISOString();
        }

        await this.setCustomer(customer);
    }

    async setBillingCycle(customerId: string, billingCycle: { startDate: string, endDate: string }): Promise<void> {
        await this.namespaces.CUSTOMERS.put(`billing_cycle:${customerId}`, JSON.stringify(billingCycle));
    }

    async getBillingCycle(customerId: string): Promise<{ startDate: string, endDate: string } | null> {
        const data = await this.namespaces.CUSTOMERS.get(`billing_cycle:${customerId}`);
        return data ? JSON.parse(data) : null;
    }

    async updateCustomerSession(customerId: string): Promise<void> {
        await this.namespaces.CUSTOMERS.put(`session:${customerId}`, Date.now().toString());
    }

    async getCustomerByEmail(email: string): Promise<Customer | null> {
        const list = await this.namespaces.CUSTOMERS.list();
        for (const key of list.keys) {
            const customer = await this.getCustomer(key.name);
            if (customer && customer.email === email) {
                return customer;
            }
        }
        return null;
    }
}