import { KVService } from '../services/kvService';
import { Customer } from '../models/customer';
import { SubscriptionPlan } from '../models/subscriptionPlan';

export async function handleCustomer(request: Request, kvService: KVService): Promise<Response> {
  try {
    const url = new URL(request.url);
    
    const customerId = url.searchParams.get('customerId') ?? request.customerId ?? "";

    switch (request.method) {
      case 'GET':
        if (url.searchParams.get('subscription')) {
          return handleGetSubscriptionDetails(customerId, kvService);
        }
        return handleGetCustomer(customerId, request, kvService);
      case 'POST':
        if (url.searchParams.get('activate')) {
          return handleActivateSubscription(customerId, request, kvService);
        }
        return handleCreateOrUpdateCustomer(customerId, request, kvService);
      case 'PUT':
        return handleUpdateCustomerSubscription(customerId, request, kvService);
      case 'PATCH':
        return handleChangePlan(customerId, request, kvService);
      default:
        return new Response('Method not allowed', { status: 405 });
    }
  } catch (error) {
    console.error('Error in handleCustomer:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

async function handleGetCustomer(customerId: string, request: Request, kvService: KVService): Promise<Response> {
  const customer = await kvService.getCustomer(customerId);
  if (!customer) {
    return new Response('Customer not found', { status: 404 });
  }

  if (!request.roles?.includes('admin') && customerId !== request.customerId) {
    return new Response('You are not authorized to view this customer', { status: 403 });
  }

  // Remove password from customer object before sending response
  const { password, ...customerWithoutPassword } = customer;
  return new Response(JSON.stringify(customerWithoutPassword), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleCreateOrUpdateCustomer(customerId: string, request: Request, kvService: KVService): Promise<Response> {
  try {
    if (!request.roles?.includes('admin') && customerId !== request.customerId) {
      return new Response('You are not authorized to create or update this customer', { status: 403 });
    }
    const customerData: Customer = await request.json();

    // Validate customer data
    if (!customerData.name || !customerData.email) {
      return new Response('Name and email are required', { status: 400 });
    }

    // Ensure the ID in the URL matches the ID in the body
    customerData.id = customerId;

    // Set default values if not provided
    customerData.subscription_plan_id = customerData.subscription_plan_id || null;
    customerData.subscription_status = customerData.subscription_status || 'inactive';
    customerData.subscription_start_date = customerData.subscription_start_date || null;
    customerData.subscription_end_date = customerData.subscription_end_date || null;

    await kvService.setCustomer(customerData);

    // Update billing cycle in KV
    if (customerData.subscription_start_date && customerData.subscription_end_date) {
      await kvService.setBillingCycle(customerId, {
        startDate: customerData.subscription_start_date,
        endDate: customerData.subscription_end_date
      });
    }

    return new Response('Customer created/updated successfully', { status: 200 });
  } catch (error) {
    return new Response('Invalid customer data', { status: 400 });
  }
}

async function handleUpdateCustomerSubscription(customerId: string, request: Request, kvService: KVService): Promise<Response> {
  try {
    const { action, planId, status } = await request.json() as { action: string; planId?: string; status?: string };

    if (action === 'assign_plan' && planId) {
      await kvService.assignSubscriptionPlan(customerId, planId);
      return new Response('Subscription plan assigned successfully', { status: 200 });
    } else if (action === 'update_status' && status) {
      if (status === 'active' || status === 'inactive' || status === 'pending' || status === 'cancelled') {
        await kvService.updateSubscriptionStatus(customerId, status);
        return new Response('Subscription status updated successfully', { status: 200 });
      } else {
        return new Response('Invalid subscription status', { status: 400 });
      }
    } else {
      return new Response('Invalid action or missing required data', { status: 400 });
    }
  } catch (error) {
    return new Response(`Error: ${(error as Error).message}`, { status: 400 });
  }
}

async function handleChangePlan(customerId: string, request: Request, kvService: KVService): Promise<Response> {
  try {
    const { newPlanId } = await request.json() as { newPlanId: string };

    if (!newPlanId) {
      return new Response('New plan ID is required', { status: 400 });
    }

    await kvService.changePlan(customerId, newPlanId);
    return new Response('Plan changed successfully', { status: 200 });
  } catch (error) {
    return new Response(`Error: ${(error as Error).message}`, { status: 400 });
  }
}

async function handleGetSubscriptionDetails(customerId: string, kvService: KVService): Promise<Response> {
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

  const billingCycle = await kvService.getBillingCycle(customerId);
  if (!billingCycle) {
    return new Response('Billing cycle not found', { status: 404 });
  }

  const subscriptionDetails = {
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
    },
    subscription: {
      plan_id: plan.id,
      plan_name: plan.name,
      status: customer.subscription_status,
      billing_cycle: plan.billing_cycle,
      price: plan.price,
      current_period_start: billingCycle.startDate,
      current_period_end: billingCycle.endDate,
    },
  };

  return new Response(JSON.stringify(subscriptionDetails), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function updateCustomerSession(customerId: string, kvService: KVService): Promise<void> {
  await kvService.updateCustomerSession(customerId);
}

async function handleActivateSubscription(customerId: string, request: Request, kvService: KVService): Promise<Response> {
  const customer = await kvService.getCustomer(customerId);
  if (!customer) {
    return new Response('Customer not found', { status: 404 });
  }

  if (customer.subscription_status === 'active') {
    return new Response('Subscription is already active', { status: 400 });
  }

  const { planId } = await request.json() as { planId: string };
  if (!planId) {
    return new Response('Plan ID is required to activate subscription', { status: 400 });
  }

  const plan = await kvService.getSubscriptionPlan(planId);
  if (!plan) {
    return new Response('Subscription plan not found', { status: 404 });
  }

  const now = new Date();
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + 1); // Assuming monthly billing cycle

  customer.subscription_plan_id = planId;
  customer.subscription_status = 'active';
  customer.subscription_start_date = now.toISOString();
  customer.subscription_end_date = endDate.toISOString();

  await kvService.setCustomer(customer);

  // Update billing cycle in BillingDO
  //   await billingDO.fetch(`/billing-cycle/${customerId}`, {
  //     method: 'POST',
  //     body: JSON.stringify({ startDate: now.toISOString(), endDate: endDate.toISOString() }),
  //   });

  return new Response('Subscription activated successfully', { status: 200 });
}

async function handleListCustomers(request: Request, kvService: KVService): Promise<Response> {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const cursor = url.searchParams.get('cursor') || undefined;

  const { customers, cursor: nextCursor } = await kvService.listCustomers(limit, cursor);

  return new Response(JSON.stringify({ customers, nextCursor }), {
    headers: { 'Content-Type': 'application/json' },
  });
}