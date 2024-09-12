import { KVService } from '../services/kvService';
import { SubscriptionPlan } from '../models/subscriptionPlan';

export async function handleSubscriptionPlan(request: Request, kvService: KVService): Promise<Response> {
  const url = new URL(request.url);
  const planId = url.searchParams.get('id');

  switch (request.method) {
    case 'GET':
      return handleGetSubscriptionPlan(planId, kvService);
    case 'POST':
      return handleCreateSubscriptionPlan(request, kvService);
    case 'PUT':
      return handleUpdateSubscriptionPlan(planId, request, kvService);
    case 'DELETE':
      return handleDeleteSubscriptionPlan(planId, kvService);
    default:
      return new Response('Method not allowed', { status: 405 });
  }
}

async function handleGetSubscriptionPlan(planId: string | null, kvService: KVService): Promise<Response> {
  if (planId) {
    const plan = await kvService.getSubscriptionPlan(planId);
    if (plan) {
      return new Response(JSON.stringify(plan), {
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      return new Response('Subscription plan not found', { status: 404 });
    }
  } else {
    const plans = await kvService.listSubscriptionPlans();
    return new Response(JSON.stringify(plans), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function handleCreateSubscriptionPlan(request: Request, kvService: KVService): Promise<Response> {
  try {
    const planData: SubscriptionPlan = await request.json();
    
    // Validate plan data
    if (!planData.id || !planData.name || !planData.price || !planData.billing_cycle) {
      return new Response('ID, name, price, and billing cycle are required', { status: 400 });
    }

    // Set default values if not provided
    planData.status = planData.status || 'inactive';
    planData.features = planData.features || [];

    await kvService.setSubscriptionPlan(planData);
    return new Response('Subscription plan created successfully', { status: 201 });
  } catch (error) {
    return new Response('Invalid subscription plan data', { status: 400 });
  }
}

async function handleUpdateSubscriptionPlan(planId: string | null, request: Request, kvService: KVService): Promise<Response> {
  if (!planId) {
    return new Response('Subscription plan ID is required', { status: 400 });
  }

  try {
    const existingPlan = await kvService.getSubscriptionPlan(planId);
    if (!existingPlan) {
      return new Response('Subscription plan not found', { status: 404 });
    }

    const updatedPlanData: Partial<SubscriptionPlan> = await request.json();
    const updatedPlan: SubscriptionPlan = { ...existingPlan, ...updatedPlanData, id: planId };

    await kvService.setSubscriptionPlan(updatedPlan);
    return new Response('Subscription plan updated successfully', { status: 200 });
  } catch (error) {
    return new Response('Invalid subscription plan data', { status: 400 });
  }
}

async function handleDeleteSubscriptionPlan(planId: string | null, kvService: KVService): Promise<Response> {
  if (!planId) {
    return new Response('Subscription plan ID is required', { status: 400 });
  }

  const existingPlan = await kvService.getSubscriptionPlan(planId);
  if (!existingPlan) {
    return new Response('Subscription plan not found', { status: 404 });
  }

  await kvService.deleteSubscriptionPlan(planId);
  return new Response('Subscription plan deleted successfully', { status: 200 });
}