import { KVService } from '../services/kvService';
import { AppError, handleError } from '../utils/errorHandler';
import { Customer } from '../models/customer';
import { SubscriptionPlan } from '../models/subscriptionPlan';

export async function handleSubscription(request: Request, kvService: KVService): Promise<Response> {
    try {
        const url = new URL(request.url);
        const customerId = url.searchParams.get('customerId');
        const planId = url.searchParams.get('planId');

        if (!customerId) {
            throw new AppError('Customer ID is required', 400);
        }

        switch (request.method) {
            case 'GET':
                return getSubscription(customerId, kvService);
            case 'POST':
                if (!planId) {
                    throw new AppError('Plan ID is required for subscription creation', 400);
                }
                return createSubscription(customerId, planId, kvService);
            case 'PUT':
                if (!planId) {
                    throw new AppError('Plan ID is required for subscription update', 400);
                }
                return updateSubscription(customerId, planId, kvService);
            case 'DELETE':
                return cancelSubscription(customerId, kvService);
            default:
                throw new AppError('Method not allowed', 405);
        }
    } catch (error) {
        return handleError(error);
    }
}

async function getSubscription(customerId: string, kvService: KVService): Promise<Response> {
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
}

async function createSubscription(customerId: string, planId: string, kvService: KVService): Promise<Response> {
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

    const customerData = await kvService.getCustomer(customerId);
    if (customerData && customerData.subscription_start_date && customerData.subscription_end_date) {
        await kvService.setBillingCycle(customerId, {
            startDate: customerData.subscription_start_date,
            endDate: customerData.subscription_end_date
        });
    }
    return new Response('Subscription created successfully', { status: 201 });
}

async function updateSubscription(customerId: string, newPlanId: string, kvService: KVService): Promise<Response> {
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
}

async function cancelSubscription(customerId: string, kvService: KVService): Promise<Response> {
    const customer = await kvService.getCustomer(customerId);
    if (!customer) {
        throw new AppError('Customer not found', 404);
    }

    if (!customer.subscription_plan_id) {
        throw new AppError('Customer does not have an active subscription', 400);
    }

    await kvService.updateSubscriptionStatus(customerId, 'cancelled');

    return new Response('Subscription cancelled successfully', { status: 200 });
}
