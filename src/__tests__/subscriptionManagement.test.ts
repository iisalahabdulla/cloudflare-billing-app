import { KVService } from '../services/kvService';
import { Customer } from '../models/customer';
import { SubscriptionPlan } from '../models/subscriptionPlan';

// Mock KVNamespace
const mockKVNamespace = {
  get: jest.fn(),
  put: jest.fn(),
  list: jest.fn(),
  delete: jest.fn(),
};

describe('Subscription Management', () => {
  let kvService: KVService;

  beforeEach(() => {
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
});