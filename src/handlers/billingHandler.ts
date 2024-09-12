import { KVService } from '../services/kvService';
import { EmailService } from '../services/emailService';
import { Customer } from '../models/customer';
import { SubscriptionPlan } from '../models/subscriptionPlan';
import { Invoice } from '../models/invoice';

export async function handleBilling(request: Request, kvService: KVService, emailService: EmailService, billingDO: DurableObjectNamespace): Promise<Response> {
  const url = new URL(request.url);
  const customerId = url.searchParams.get('customerId');

  if (request.method === 'POST') {
    // Generate invoice for a specific customer
    if (!customerId) {
      return new Response('Customer ID is required for invoice generation', { status: 400 });
    }
    return handleGenerateInvoice(customerId, kvService, emailService, billingDO);
  } else if (request.method === 'GET') {
    // Run billing process for all customers or a specific customer
    return handleBillingProcess(customerId, kvService, emailService, billingDO);
  } else {
    return new Response('Method not allowed', { status: 405 });
  }
}

export async function handleGenerateInvoice(customerId: string, kvService: KVService, emailService: EmailService, billingDO: DurableObjectNamespace): Promise<Response> {
  try {
    const customer = await kvService.getCustomer(customerId);
    if (!customer) {
      return new Response('Customer not found', { status: 404 });
    }

    if (customer.subscription_status !== 'active' || !customer.subscription_plan_id) {
      return new Response('Customer does not have an active subscription', { status: 400 });
    }

    const plan = await kvService.getSubscriptionPlan(customer.subscription_plan_id);
    if (!plan) {
      return new Response('Subscription plan not found', { status: 404 });
    }

    const id = billingDO.idFromName(customerId);
    const obj = billingDO.get(id);
    const billingCycleResponse = await obj.fetch(`https://dummy-url/billing-cycle/${customerId}`);
    const billingCycle = await billingCycleResponse.json();

    if (isBillingCycle(billingCycle)) {
      const invoice = await createInvoice(customer, plan, billingCycle, kvService, emailService);
      return new Response(JSON.stringify(invoice), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      throw new Error('Invalid billing cycle data');
    }
  } catch (error) {
    return new Response(`Error generating invoice: ${(error as Error).message}`, { status: 500 });
  }
}

async function handleBillingProcess(customerId: string | null, kvService: KVService, emailService: EmailService, billingDO: DurableObjectNamespace): Promise<Response> {
  try {
    let customers: Customer[];
    if (customerId) {
      const customer = await kvService.getCustomer(customerId);
      customers = customer ? [customer] : [];
    } else {
      customers = await kvService.listCustomers();
    }

    const invoicesGenerated = await generateInvoices(customers, kvService, emailService, billingDO);
    return new Response(`Billing process completed. Generated ${invoicesGenerated} invoices.`, { status: 200 });
  } catch (error) {
    return new Response(`Error during billing process: ${(error as Error).message}`, { status: 500 });
  }
}

async function generateInvoices(customers: Customer[], kvService: KVService, emailService: EmailService, billingDO: DurableObjectNamespace): Promise<number> {
  let invoicesGenerated = 0;

  for (const customer of customers) {
    if (customer.subscription_status === 'active' && customer.subscription_plan_id) {
      const plan = await kvService.getSubscriptionPlan(customer.subscription_plan_id);
      if (plan && isInvoiceDue(customer, plan)) {
        const id = billingDO.idFromName(customer.id);
        const obj = billingDO.get(id);
        const billingCycleResponse = await obj.fetch(`https://dummy-url/billing-cycle/${customer.id}`);
        const billingCycle = await billingCycleResponse.json();

        if (isBillingCycle(billingCycle)) {
          await createInvoice(customer, plan, billingCycle, kvService, emailService);
          invoicesGenerated++;
        } else {
          console.error(`Invalid billing cycle data for customer ${customer.id}`);
        }
      }
    }
  }

  return invoicesGenerated;
}

function isInvoiceDue(customer: Customer, plan: SubscriptionPlan): boolean {
  const now = new Date();
  const endDate = new Date(customer.subscription_end_date!);
  const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  switch (plan.billing_cycle) {
    case 'monthly':
      return daysUntilEnd <= 3;
    case 'quarterly':
      return daysUntilEnd <= 7;
    case 'yearly':
      return daysUntilEnd <= 14;
    default:
      return false;
  }
}

async function createInvoice(customer: Customer, plan: SubscriptionPlan, billingCycle: { startDate: string, endDate: string }, kvService: KVService, emailService: EmailService): Promise<Invoice> {
  const invoice: Invoice = {
    id: `INV-${Date.now()}-${customer.id}`,
    customer_id: customer.id,
    amount: plan.price,
    due_date: billingCycle.endDate,
    payment_status: 'pending',
    payment_date: null,
  };

  await kvService.setInvoice(invoice);

  // Send invoice notification
  await emailService.sendInvoiceNotification(customer.email, invoice.id, invoice.amount, invoice.due_date);

  // Update customer's subscription dates
  const oldEndDate = billingCycle.endDate;
  customer.subscription_start_date = oldEndDate;
  customer.subscription_end_date = kvService.calculateSubscriptionEndDate(plan.billing_cycle, oldEndDate);
  await kvService.setCustomer(customer);

  return invoice;
}

function isBillingCycle(obj: unknown): obj is { startDate: string; endDate: string } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'startDate' in obj &&
    'endDate' in obj &&
    typeof (obj as any).startDate === 'string' &&
    typeof (obj as any).endDate === 'string'
  );
}