import { KVService } from '../services/kvService';

export async function handleSubscription(request: Request, kvService: KVService): Promise<Response> {
	try {
		const customerId = request.customerId;
		if (!customerId) {
			return new Response('Customer ID is required', { status: 400 });
		}

		const url = new URL(request.url);
		const planId = url.searchParams.get('planId');

		switch (request.method) {
			case 'GET':
				return await getSubscription(customerId, kvService);
			case 'POST':
				if (!planId) {
					return new Response('Plan ID is required for subscription creation', { status: 400 });
				}
				return await createSubscription(customerId, planId, kvService);
			case 'PUT':
				if (!planId) {
					return new Response('Plan ID is required for subscription update', { status: 400 });
				}
				return await updateSubscription(customerId, planId, kvService);
			case 'DELETE':
				return await cancelSubscription(customerId, kvService);
			default:
				return new Response('Method not allowed', { status: 405 });
		}
	} catch (error) {
		console.error('Error in handleSubscription:', error);
		return new Response('Internal Server Error', { status: 500 });
	}
}

// Update other functions in this file to use the customerId from the request

async function getSubscription(customerId: string, kvService: KVService): Promise<Response> {
	try {
		const customer = await kvService.getCustomer(customerId);
		if (!customer) {
			return new Response('Customer not found', { status: 404 });
		}

		if (!customer.subscription_plan_id) {
			return new Response('Customer does not have an active subscription', { status: 404 });
		}

		const plan = await kvService.getSubscriptionPlan(customer.subscription_plan_id);
		if (!plan) {
			return new Response('Subscription plan not found', { status: 404 });
		}

		const subscription = {
			customerId: customer.id,
			planId: plan.id,
			planName: plan.name,
			status: customer.subscription_status,
			startDate: customer.subscription_start_date,
			endDate: customer.subscription_end_date,
		};

		return new Response(JSON.stringify(subscription), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('Error in getSubscription:', error);
		return new Response('Internal Server Error', { status: 500 });
	}
}

export async function createSubscription(customerId: string, planId: string, kvService: KVService, testMode: boolean = false) {
	try {
		const customer = await kvService.getCustomer(customerId);
		if (!customer) {
			return new Response('Customer not found', { status: 404 });
		}

		if (customer.subscription_plan_id) {
			return new Response('Customer already has an active subscription', { status: 400 });
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

		await kvService.assignSubscriptionPlan(customerId, planId);
		await kvService.setCustomer(customer);

		await kvService.setBillingCycle(customerId, {
			startDate: customer.subscription_start_date,
			endDate: customer.subscription_end_date
		});

		if (!testMode) {
			// Perform any non-test mode specific operations here
			// For example, sending a welcome email
			// await sendWelcomeEmail(customer.email);
		}

		return new Response('Subscription created successfully', { status: 201 });
	} catch (error) {
		console.error('Error in createSubscription:', error);
		return new Response('Internal Server Error', { status: 500 });
	}
}

async function updateSubscription(customerId: string, newPlanId: string, kvService: KVService): Promise<Response> {
	try {
		const customer = await kvService.getCustomer(customerId);
		if (!customer) {
			return new Response('Customer not found', { status: 404 });
		}

		if (!customer.subscription_plan_id) {
			return new Response('Customer does not have an active subscription', { status: 400 });
		}

		const newPlan = await kvService.getSubscriptionPlan(newPlanId);
		if (!newPlan) {
			return new Response('New subscription plan not found', { status: 404 });
		}

		await kvService.changePlan(customerId, newPlanId);

		return new Response('Subscription updated successfully', { status: 200 });
	} catch (error) {
		console.error('Error in updateSubscription:', error);
		return new Response('Internal Server Error', { status: 500 });
	}
}

async function cancelSubscription(customerId: string, kvService: KVService): Promise<Response> {
	try {
		const customer = await kvService.getCustomer(customerId);
		if (!customer) {
			return new Response('Customer not found', { status: 404 });
		}

		if (!customer.subscription_plan_id) {
			return new Response('Customer does not have an active subscription', { status: 400 });
		}

		await kvService.updateSubscriptionStatus(customerId, 'cancelled');

		return new Response('Subscription cancelled successfully', { status: 200 });
	} catch (error) {
		console.error('Error in cancelSubscription:', error);
		return new Response('Internal Server Error', { status: 500 });
	}
}

async function handleListSubscriptions(request: Request, kvService: KVService): Promise<Response> {
	const url = new URL(request.url);
	const limit = parseInt(url.searchParams.get('limit') || '10');
	const cursor = url.searchParams.get('cursor') || undefined;

	const { plans, cursor: nextCursor } = await kvService.listSubscriptionPlans(limit, cursor);

	return new Response(JSON.stringify({ plans, nextCursor }), {
		headers: { 'Content-Type': 'application/json' },
	});
}
