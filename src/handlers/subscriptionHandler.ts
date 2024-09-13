import { KVService } from '../services/kvService';
import { AppError, handleError } from '../utils/errorHandler';

export async function handleSubscription(request: Request, kvService: KVService): Promise<Response> {
	try {
		const customerId = request.customerId; // Get customerId from the request
		const url = new URL(request.url);
		const planId = url.searchParams.get('planId');

		switch (request.method) {
			case 'GET':
				return await getSubscription(customerId, kvService);
			case 'POST':
				if (!planId) {
					throw new AppError('Plan ID is required for subscription creation', 400);
				}
				return await createSubscription(customerId, planId, kvService);
			case 'PUT':
				if (!planId) {
					throw new AppError('Plan ID is required for subscription update', 400);
				}
				return await updateSubscription(customerId, planId, kvService);
			case 'DELETE':
				return await cancelSubscription(customerId, kvService);
			default:
				throw new AppError('Method not allowed', 405);
		}
	} catch (error) {
		return handleError(error);
	}
}

// Update other functions in this file to use the customerId from the request

async function getSubscription(customerId: string, kvService: KVService): Promise<Response> {
	try {
		const customer = await kvService.getCustomer(customerId);
		if (!customer) {
			throw new AppError('Customer not found', 404);
		}

		if (!customer.subscription_plan_id) {
			throw new AppError('Customer does not have an active subscription', 404);
		}

		const plan = await kvService.getSubscriptionPlan(customer.subscription_plan_id);
		if (!plan) {
			throw new AppError('Subscription plan not found', 404);
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
		return handleError(error);
	}
}

export async function createSubscription(customerId: string, planId: string, kvService: KVService, testMode: boolean = false) {
	try {
		const customer = await kvService.getCustomer(customerId);
		if (!customer) {
			throw new AppError('Customer not found', 404);
		}

		if (customer.subscription_plan_id) {
			throw new AppError('Customer already has an active subscription', 400);
		}

		const plan = await kvService.getSubscriptionPlan(planId);
		if (!plan) {
			throw new AppError('Subscription plan not found', 404);
		}

		await kvService.assignSubscriptionPlan(customerId, planId);

		const updatedCustomer = await kvService.getCustomer(customerId);
		if (updatedCustomer && updatedCustomer.subscription_start_date && updatedCustomer.subscription_end_date) {
			await kvService.setBillingCycle(customerId, {
				startDate: updatedCustomer.subscription_start_date,
				endDate: updatedCustomer.subscription_end_date
			});
		} else {
			console.warn('Unable to set billing cycle: missing customer data or dates');
		}

		if (!testMode) {
			// Perform any non-test mode specific operations here
			// For example, sending a welcome email
			// await sendWelcomeEmail(customer.email);
		}

		return new Response('Subscription created successfully', { status: 201 });
	} catch (error) {
		console.error('Error in createSubscription:', error);
		if (error instanceof AppError) {
			return new Response(error.message, { status: error.status });
		}
		return handleError(error);
	}
}

async function updateSubscription(customerId: string, newPlanId: string, kvService: KVService): Promise<Response> {
	try {
		const customer = await kvService.getCustomer(customerId);
		if (!customer) {
			throw new AppError('Customer not found', 404);
		}

		if (!customer.subscription_plan_id) {
			throw new AppError('Customer does not have an active subscription', 400);
		}

		const newPlan = await kvService.getSubscriptionPlan(newPlanId);
		if (!newPlan) {
			throw new AppError('New subscription plan not found', 404);
		}

		await kvService.changePlan(customerId, newPlanId);

		return new Response('Subscription updated successfully', { status: 200 });
	} catch (error) {
		return handleError(error);
	}
}

async function cancelSubscription(customerId: string, kvService: KVService): Promise<Response> {
	try {
		const customer = await kvService.getCustomer(customerId);
		if (!customer) {
			throw new AppError('Customer not found', 404);
		}

		if (!customer.subscription_plan_id) {
			throw new AppError('Customer does not have an active subscription', 400);
		}

		await kvService.updateSubscriptionStatus(customerId, 'cancelled');

		return new Response('Subscription cancelled successfully', { status: 200 });
	} catch (error) {
		return handleError(error);
	}
}
