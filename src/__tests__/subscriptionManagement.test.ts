import { KVService } from '../services/kvService';
import { Customer } from '../models/customer';
import { SubscriptionPlan } from '../models/subscriptionPlan';
import { createSubscription } from '../handlers/subscriptionHandler';

// Mock KVNamespace
const mockKVNamespace = {
  get: jest.fn(),
  put: jest.fn(),
  list: jest.fn(),
  delete: jest.fn(),
};

// Mock handleError function
jest.mock('../utils/errorHandler', () => ({
  handleError: jest.fn((error) => new Response(error.message, { status: error.status || 500 })),
}));

describe('Subscription Management', () => {
  let kvService: KVService;

  beforeEach(() => {
    jest.clearAllMocks();
    kvService = new KVService({
      CUSTOMERS: mockKVNamespace as unknown as KVNamespace,
      SUBSCRIPTIONS: mockKVNamespace as unknown as KVNamespace,
      INVOICES: mockKVNamespace as unknown as KVNamespace,
      PAYMENTS: mockKVNamespace as unknown as KVNamespace,
    });
  });

  test('assignSubscriptionPlan should update customer subscription', async () => {
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

    mockKVNamespace.get.mockResolvedValueOnce(JSON.stringify(customer));
    mockKVNamespace.get.mockResolvedValueOnce(JSON.stringify(plan));

    await kvService.assignSubscriptionPlan(customerId, planId);

    expect(mockKVNamespace.put).toHaveBeenCalledWith(
      customerId,
      expect.stringContaining('"subscription_status":"active"')
    );
    expect(mockKVNamespace.put).toHaveBeenCalledWith(
      customerId,
      expect.stringContaining(`"subscription_plan_id":"${planId}"`)
    );
  });

  test('createSubscription should create a new subscription', async () => {
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

    // Mock KVService methods
    kvService.getCustomer = jest.fn()
      .mockResolvedValueOnce(customer)
      .mockResolvedValueOnce({
        ...customer,
        subscription_plan_id: planId,
        subscription_status: 'active',
        subscription_start_date: new Date().toISOString(),
        subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    kvService.getSubscriptionPlan = jest.fn().mockResolvedValue(plan);
    kvService.assignSubscriptionPlan = jest.fn().mockResolvedValue(undefined);
    kvService.setBillingCycle = jest.fn().mockResolvedValue(undefined);

    const result = await createSubscription(customerId, planId, kvService, true);

    if (result.status !== 201) {
      console.error('Unexpected status:', result.status);
      console.error('Response text:', await result.text());
    }

    expect(result.status).toBe(201);
    expect(await result.text()).toBe('Subscription created successfully');
    expect(kvService.assignSubscriptionPlan).toHaveBeenCalledWith(customerId, planId);
    expect(kvService.setBillingCycle).toHaveBeenCalled();
  });
});