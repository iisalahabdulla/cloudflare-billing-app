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

// Mock handleError function
jest.mock('../utils/errorHandler', () => ({
  handleError: jest.fn((error) => new Response(error.message, { status: error.status || 500 })),
}));

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

    // Mock the getCustomer method to return the customer
    kvService.getCustomer = jest.fn().mockResolvedValue(customer);
    
    // Mock the getSubscriptionPlan method to return the plan
    kvService.getSubscriptionPlan = jest.fn().mockResolvedValue(plan);
    
    // Mock the assignSubscriptionPlan method
    kvService.assignSubscriptionPlan = jest.fn().mockResolvedValue(undefined);
    
    // Mock the setCustomer method
    kvService.setCustomer = jest.fn().mockResolvedValue(undefined);
    
    // Mock the setBillingCycle method
    kvService.setBillingCycle = jest.fn().mockResolvedValue(undefined);

    const request = new Request('https://dummy-url/subscription?planId=' + planId, {
      method: 'POST',
    });
    (request as any).customerId = customerId;

    const response = await handleSubscription(request, kvService);

    expect(response.status).toBe(201);
    expect(await response.text()).toBe('Subscription created successfully');
    expect(kvService.assignSubscriptionPlan).toHaveBeenCalledWith(customerId, planId);
    expect(kvService.setCustomer).toHaveBeenCalled();
    expect(kvService.setBillingCycle).toHaveBeenCalled();
  });
});