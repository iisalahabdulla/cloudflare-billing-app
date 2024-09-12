import { KVService } from '../services/kvService';
import { Customer } from '../models/customer';
import { SubscriptionPlan } from '../models/subscriptionPlan';
import { AppError, handleError } from '../utils/errorHandler';

export async function handleCustomer(request: Request, kvService: KVService, billingDO: DurableObjectNamespace): Promise<Response> {
  try {
    const url = new URL(request.url);
    const customerId = url.searchParams.get('id');

    if (!customerId) {
      throw new AppError('Customer ID is required', 400);
    }

    // Update customer session
    const id = billingDO.idFromName(customerId);
    const obj = billingDO.get(id);
    await obj.fetch(`https://dummy-url/session/${customerId}`, { method: 'POST' });

    switch (request.method) {
      case 'GET':
        if (url.searchParams.get('subscription') === 'true') {
          return handleGetSubscriptionDetails(customerId, kvService, obj);
        }
        return handleGetCustomer(customerId, kvService);
      case 'POST':
        return handleCreateOrUpdateCustomer(customerId, request, kvService, obj);
      case 'PUT':
        return handleUpdateCustomerSubscription(customerId, request, kvService, obj);
      case 'PATCH':
        return handleChangePlan(customerId, request, kvService, obj);
      default:
        throw new AppError('Method not allowed', 405);
    }
  } catch (error) {
    return handleError(error);
  }
}

async function handleGetCustomer(customerId: string, kvService: KVService): Promise<Response> {
  const customer = await kvService.getCustomer(customerId);
  if (!customer) {
    throw new AppError('Customer not found', 404);
  }
  return new Response(JSON.stringify(customer), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleCreateOrUpdateCustomer(customerId: string, request: Request, kvService: KVService, obj: DurableObjectStub): Promise<Response> {
  try {
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

    // Update billing cycle in Durable Object
    if (customerData.subscription_start_date && customerData.subscription_end_date) {
      await obj.fetch(`https://dummy-url/billing-cycle/${customerId}`, {
        method: 'POST',
        body: JSON.stringify({
          startDate: customerData.subscription_start_date,
          endDate: customerData.subscription_end_date
        })
      });
    }

    return new Response('Customer created/updated successfully', { status: 200 });
  } catch (error) {
    return new Response('Invalid customer data', { status: 400 });
  }
}

async function handleUpdateCustomerSubscription(customerId: string, request: Request, kvService: KVService, obj: DurableObjectStub): Promise<Response> {
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

async function handleChangePlan(customerId: string, request: Request, kvService: KVService, obj: DurableObjectStub): Promise<Response> {
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

async function handleGetSubscriptionDetails(customerId: string, kvService: KVService, obj: DurableObjectStub): Promise<Response> {
  try {
    const customer = await kvService.getCustomer(customerId);
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    if (!customer.subscription_plan_id) {
      throw new AppError('Customer does not have an active subscription', 400);
    }

    const plan = await kvService.getSubscriptionPlan(customer.subscription_plan_id);
    if (!plan) {
      throw new AppError('Subscription plan not found', 404);
    }

    const billingCycleResponse = await obj.fetch(`https://dummy-url/billing-cycle/${customerId}`);
    const billingCycle = await billingCycleResponse.json() as { startDate: string; endDate: string };

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
  } catch (error) {
    return new Response(`Error retrieving subscription details: ${(error as Error).message}`, { status: 500 });
  }
}