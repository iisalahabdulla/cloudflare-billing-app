import { KVService } from '../services/kvService';
import { SubscriptionPlan } from '../models/subscriptionPlan';

export async function handleSubscriptionPlan(request: Request, kvService: KVService): Promise<Response> {
	try {
		const url = new URL(request.url);
		const planId = url.searchParams.get('planId');

		switch (request.method) {
			case 'GET':
				if (planId) {
					return await getSubscriptionPlan(planId, kvService);
				} else {
					return await listSubscriptionPlans(request, kvService);
				}
			case 'POST':
				return await createSubscriptionPlan(request, kvService);
			case 'PUT':
				if (!planId) {
					return new Response('Plan ID is required for update', { status: 400 });
				}
				return await updateSubscriptionPlan(planId, request, kvService);
			case 'DELETE':
				if (!planId) {
					return new Response('Plan ID is required for deletion', { status: 400 });
				}
				return await deleteSubscriptionPlan(planId, kvService);
			default:
				return new Response('Method not allowed', { status: 405 });
		}
	} catch (error) {
		console.error('Error in handleSubscriptionPlan:', error);
		return new Response('Internal Server Error', { status: 500 });
	}
}

async function getSubscriptionPlan(planId: string, kvService: KVService): Promise<Response> {
	const plan = await kvService.getSubscriptionPlan(planId);
	if (!plan) {
		return new Response('Subscription plan not found', { status: 404 });
	}
	return new Response(JSON.stringify(plan), {
		headers: { 'Content-Type': 'application/json' },
	});
}

async function listSubscriptionPlans(request: Request, kvService: KVService): Promise<Response> {
	const url = new URL(request.url);
	const limit = parseInt(url.searchParams.get('limit') || '10');
	const cursor = url.searchParams.get('cursor') || undefined;

	const { plans, cursor: nextCursor } = await kvService.listSubscriptionPlans(limit, cursor);

	return new Response(JSON.stringify({ plans, nextCursor }), {
		headers: { 'Content-Type': 'application/json' },
	});
}

async function createSubscriptionPlan(request: Request, kvService: KVService): Promise<Response> {
	const planData: Omit<SubscriptionPlan, 'id'> = await request.json();

	if (!planData.name || !planData.price || !planData.billing_cycle) {
		return new Response('Name, price, and billing cycle are required', { status: 400 });
	}

	const newPlan: SubscriptionPlan = {
		id: `PLAN-${Date.now()}`,
		...planData,
	};

	await kvService.setSubscriptionPlan(newPlan);

	return new Response(JSON.stringify(newPlan), {
		status: 201,
		headers: { 'Content-Type': 'application/json' },
	});
}

async function updateSubscriptionPlan(planId: string, request: Request, kvService: KVService): Promise<Response> {
	const existingPlan = await kvService.getSubscriptionPlan(planId);
	if (!existingPlan) {
		return new Response('Subscription plan not found', { status: 404 });
	}

	const updatedPlanData: Partial<SubscriptionPlan> = await request.json();
	const updatedPlan: SubscriptionPlan = { ...existingPlan, ...updatedPlanData, id: planId };

	await kvService.setSubscriptionPlan(updatedPlan);

	return new Response(JSON.stringify(updatedPlan), {
		headers: { 'Content-Type': 'application/json' },
	});
}

async function deleteSubscriptionPlan(planId: string, kvService: KVService): Promise<Response> {
	const existingPlan = await kvService.getSubscriptionPlan(planId);
	if (!existingPlan) {
		return new Response('Subscription plan not found', { status: 404 });
	}

	await kvService.deleteSubscriptionPlan(planId);

	return new Response('Subscription plan deleted successfully', { status: 200 });
}