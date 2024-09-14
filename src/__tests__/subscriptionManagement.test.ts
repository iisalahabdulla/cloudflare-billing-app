import { handleSubscription } from '../handlers/subscriptionHandler';
import { KVService } from '../services/kvService';
import { Customer } from '../models/customer';
import { SubscriptionPlan } from '../models/subscriptionPlan';
import { Env } from '../types/env';

// Mock KVNamespace
const mockKVNamespace = {
  get: jest.fn(),
  put: jest.fn(),
  list: jest.fn(),
  delete: jest.fn(),
};

describe('Subscription Management', () => {
  let kvService: KVService;
  let mockEnv: Env;

  beforeEach(() => {
    jest.clearAllMocks();
    kvService = new KVService({
      CUSTOMERS: mockKVNamespace as unknown as KVNamespace,
      SUBSCRIPTIONS: mockKVNamespace as unknown as KVNamespace,
      INVOICES: mockKVNamespace as unknown as KVNamespace,
      PAYMENTS: mockKVNamespace as unknown as KVNamespace,
    });
    mockEnv = {
      JWT_SECRET: 'test-secret',
      CUSTOMERS: mockKVNamespace as unknown as KVNamespace,
      SUBSCRIPTIONS: mockKVNamespace as unknown as KVNamespace,
      INVOICES: mockKVNamespace as unknown as KVNamespace,
      PAYMENTS: mockKVNamespace as unknown as KVNamespace,
      SENDGRID_API_KEY: 'test-sendgrid-key',
      FROM_EMAIL: 'test@example.com',
    };
  });

  test('handleSubscription should create a new subscription', async () => {
    const customerId = 'customer1';
    const planId = 'plan1';
    const customer: Customer = {
      id: customerId,
      name: 'Test Customer',
      email: 'test@example.com',
      subscription_plan_id: null,
      subscription_status: 'inactive',
      subscription_start_date: null,
      subscription_end_date: null,
    };
    const plan: SubscriptionPlan = {
      id: planId,
      name: 'Basic Plan',
      description: 'Basic subscription plan',
      price: 9.99,
      billing_cycle: 'monthly',
      features: ['feature1', 'feature2'],
      status: 'active',
    };

    kvService.getCustomer = jest.fn().mockResolvedValue(customer);
    kvService.getSubscriptionPlan = jest.fn().mockResolvedValue(plan);
    kvService.assignSubscriptionPlan = jest.fn().mockResolvedValue(undefined);
    kvService.setCustomer = jest.fn().mockResolvedValue(undefined);
    kvService.setBillingCycle = jest.fn().mockResolvedValue(undefined);
    
    const request = new Request('https://dummy-url/subscription?planId=' + planId, {
      method: 'POST',
    });
    (request as any).customerId = customerId;

    const response = await handleSubscription(request, kvService);

    expect(response.status).toBe(201);
    expect(await response.text()).toBe('Subscription created successfully');
  });

  test('handleSubscription should get an existing subscription', async () => {
    const customerId = 'customer1';
    const planId = 'plan1';
    const customer: Customer = {
      id: customerId,
      name: 'Test Customer',
      email: 'test@example.com',
      subscription_plan_id: planId,
      subscription_status: 'active',
      subscription_start_date: '2023-01-01T00:00:00Z',
      subscription_end_date: '2023-02-01T00:00:00Z',
    };
    const plan: SubscriptionPlan = {
      id: planId,
      name: 'Basic Plan',
      description: 'Basic subscription plan',
      price: 9.99,
      billing_cycle: 'monthly',
      features: ['feature1', 'feature2'],
      status: 'active',
    };

    kvService.getCustomer = jest.fn().mockResolvedValue(customer);
    kvService.getSubscriptionPlan = jest.fn().mockResolvedValue(plan);

    const request = new Request('https://dummy-url/subscription', {
      method: 'GET',
    });
    (request as any).customerId = customerId;

    const response = await handleSubscription(request, kvService);

    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody).toEqual({
      customerId: customerId,
      planId: planId,
      planName: plan.name,
      status: 'active',
      startDate: '2023-01-01T00:00:00Z',
      endDate: '2023-02-01T00:00:00Z',
    });
  });

  test('handleSubscription should update an existing subscription', async () => {
    const customerId = 'customer1';
    const oldPlanId = 'plan1';
    const newPlanId = 'plan2';
    const customer: Customer = {
      id: customerId,
      name: 'Test Customer',
      email: 'test@example.com',
      subscription_plan_id: oldPlanId,
      subscription_status: 'active',
      subscription_start_date: '2023-01-01T00:00:00Z',
      subscription_end_date: '2023-02-01T00:00:00Z',
    };
    const newPlan: SubscriptionPlan = {
      id: newPlanId,
      name: 'Premium Plan',
      description: 'Premium subscription plan',
      price: 19.99,
      billing_cycle: 'monthly',
      features: ['feature1', 'feature2', 'feature3'],
      status: 'active',
    };

    kvService.getCustomer = jest.fn().mockResolvedValue(customer);
    kvService.getSubscriptionPlan = jest.fn().mockResolvedValue(newPlan);
    kvService.changePlan = jest.fn().mockResolvedValue(undefined);

    const request = new Request('https://dummy-url/subscription?planId=' + newPlanId, {
      method: 'PUT',
    });
    (request as any).customerId = customerId;

    const response = await handleSubscription(request, kvService);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('Subscription updated successfully');
    expect(kvService.changePlan).toHaveBeenCalledWith(customerId, newPlanId);
  });

  test('handleSubscription should cancel an existing subscription', async () => {
    const customerId = 'customer1';
    const planId = 'plan1';
    const customer: Customer = {
      id: customerId,
      name: 'Test Customer',
      email: 'test@example.com',
      subscription_plan_id: planId,
      subscription_status: 'active',
      subscription_start_date: '2023-01-01T00:00:00Z',
      subscription_end_date: '2023-02-01T00:00:00Z',
    };

    kvService.getCustomer = jest.fn().mockResolvedValue(customer);
    kvService.updateSubscriptionStatus = jest.fn().mockResolvedValue(undefined);

    const request = new Request('https://dummy-url/subscription', {
      method: 'DELETE',
    });
    (request as any).customerId = customerId;

    const response = await handleSubscription(request, kvService);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('Subscription cancelled successfully');
    expect(kvService.updateSubscriptionStatus).toHaveBeenCalledWith(customerId, 'cancelled');
  });

  test('handleSubscription should throw an error when creating a subscription for a customer with an existing subscription', async () => {
    const customerId = 'customer1';
    const planId = 'plan1';
    const customer: Customer = {
      id: customerId,
      name: 'Test Customer',
      email: 'test@example.com',
      subscription_plan_id: planId,
      subscription_status: 'active',
      subscription_start_date: '2023-01-01T00:00:00Z',
      subscription_end_date: '2023-02-01T00:00:00Z',
    };

    kvService.getCustomer = jest.fn().mockResolvedValue(customer);

    const request = new Request('https://dummy-url/subscription?planId=' + planId, {
      method: 'POST',
    });
    (request as any).customerId = customerId;

    const response = await handleSubscription(request, kvService);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Customer already has an active subscription');
  });

  test('handleSubscription should throw an error when updating a subscription for a customer without an active subscription', async () => {
    const customerId = 'customer1';
    const planId = 'plan1';
    const customer: Customer = {
      id: customerId,
      name: 'Test Customer',
      email: 'test@example.com',
      subscription_plan_id: null,
      subscription_status: 'inactive',
      subscription_start_date: null,
      subscription_end_date: null,
    };

    kvService.getCustomer = jest.fn().mockResolvedValue(customer);

    const request = new Request('https://dummy-url/subscription?planId=' + planId, {
      method: 'PUT',
    });
    (request as any).customerId = customerId;

    const response = await handleSubscription(request, kvService);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Customer does not have an active subscription');
  });

  test('handleSubscription should throw an error when cancelling a subscription for a customer without an active subscription', async () => {
    const customerId = 'customer1';
    const customer: Customer = {
      id: customerId,
      name: 'Test Customer',
      email: 'test@example.com',
      subscription_plan_id: null,
      subscription_status: 'inactive',
      subscription_start_date: null,
      subscription_end_date: null,
    };

    kvService.getCustomer = jest.fn().mockResolvedValue(customer);

    const request = new Request('https://dummy-url/subscription', {
      method: 'DELETE',
    });
    (request as any).customerId = customerId;

    const response = await handleSubscription(request, kvService);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Customer does not have an active subscription');
  });

  test('handleSubscription should return 404 when creating a subscription for a non-existent customer', async () => {
    const customerId = 'nonexistent-customer';
    const planId = 'plan1';

    kvService.getCustomer = jest.fn().mockResolvedValue(null);

    const request = new Request('https://dummy-url/subscription?planId=' + planId, {
      method: 'POST',
    });
    (request as any).customerId = customerId;

    const response = await handleSubscription(request, kvService);

    expect(response.status).toBe(404);
    expect(await response.text()).toBe('Customer not found');
  });

  test('handleSubscription should return 404 when updating a subscription with a non-existent plan', async () => {
    const customerId = 'customer1';
    const oldPlanId = 'plan1';
    const newPlanId = 'nonexistent-plan';
    const customer: Customer = {
      id: customerId,
      name: 'Test Customer',
      email: 'test@example.com',
      subscription_plan_id: oldPlanId,
      subscription_status: 'active',
      subscription_start_date: '2023-01-01T00:00:00Z',
      subscription_end_date: '2023-02-01T00:00:00Z',
    };

    kvService.getCustomer = jest.fn().mockResolvedValue(customer);
    kvService.getSubscriptionPlan = jest.fn().mockResolvedValue(null);

    const request = new Request('https://dummy-url/subscription?planId=' + newPlanId, {
      method: 'PUT',
    });
    (request as any).customerId = customerId;

    const response = await handleSubscription(request, kvService);

    expect(response.status).toBe(404);
    expect(await response.text()).toBe('New subscription plan not found');
  });

  test('handleSubscription should return 404 when cancelling a subscription for a non-existent customer', async () => {
    const customerId = 'nonexistent-customer';

    kvService.getCustomer = jest.fn().mockResolvedValue(null);

    const request = new Request('https://dummy-url/subscription', {
      method: 'DELETE',
    });
    (request as any).customerId = customerId;

    const response = await handleSubscription(request, kvService);

    expect(response.status).toBe(404);
    expect(await response.text()).toBe('Customer not found');
  });
});