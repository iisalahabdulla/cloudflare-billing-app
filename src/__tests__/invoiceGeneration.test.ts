import { handleGenerateInvoice } from '../handlers/billingHandler';
import { KVService } from '../services/kvService';
import { EmailService } from '../services/emailService';
import { Customer } from '../models/customer';
import { SubscriptionPlan } from '../models/subscriptionPlan';
import { Env } from '../types/env';

// Mock KVNamespace and EmailService
const mockKVNamespace = {
  get: jest.fn(),
  put: jest.fn(),
  list: jest.fn(),
  delete: jest.fn(),
};

const mockEmailService = {
  sendInvoiceNotification: jest.fn(),
};

describe('Invoice Generation', () => {
  let kvService: KVService;
  let emailService: EmailService;
  let mockEnv: Env;

  beforeEach(() => {
    kvService = new KVService({
      CUSTOMERS: mockKVNamespace as unknown as KVNamespace,
      SUBSCRIPTIONS: mockKVNamespace as unknown as KVNamespace,
      INVOICES: mockKVNamespace as unknown as KVNamespace,
      PAYMENTS: mockKVNamespace as unknown as KVNamespace,
    });
    emailService = mockEmailService as unknown as EmailService;
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

  test('handleGenerateInvoice should create an invoice for an active subscription', async () => {
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
    const billingCycle = {
      startDate: '2023-01-01T00:00:00Z',
      endDate: '2023-02-01T00:00:00Z',
    };

    mockKVNamespace.get.mockResolvedValueOnce(JSON.stringify(customer));
    mockKVNamespace.get.mockResolvedValueOnce(JSON.stringify(plan));
    mockKVNamespace.get.mockResolvedValueOnce(JSON.stringify(billingCycle));

    const request = new Request('https://dummy-url/billing', {
      method: 'POST',
    });
    request.customerId = customerId;

    const response = await handleGenerateInvoice(request.customerId, kvService, emailService);

    expect(response.status).toBe(201);
    const responseBody = await response.json() as { id: string; customer_id: string; amount: number };
    expect(responseBody).toHaveProperty('id');
    expect(responseBody.customer_id).toBe(customerId);
    expect(responseBody.amount).toBe(plan.price);
    expect(mockEmailService.sendInvoiceNotification).toHaveBeenCalled();
  });

  test('handleGenerateInvoice should return 404 if customer does not exist', async () => {
    const customerId = 'nonexistent-customer';
    mockKVNamespace.get.mockResolvedValueOnce(null);

    const request = new Request('https://dummy-url/billing', {
      method: 'POST',
    });
    request.customerId = customerId;

    const response = await handleGenerateInvoice(request.customerId, kvService, emailService);

    expect(response.status).toBe(404);
    expect(await response.text()).toBe('Customer not found');
  });

  test('handleGenerateInvoice should return 404 if subscription plan does not exist', async () => {
    const customerId = 'customer1';
    const customer: Customer = {
      id: customerId,
      name: 'Test Customer',
      email: 'test@example.com',
      subscription_plan_id: 'nonexistent-plan',
      subscription_status: 'active',
      subscription_start_date: '2023-01-01T00:00:00Z',
      subscription_end_date: '2023-02-01T00:00:00Z',
    };

    mockKVNamespace.get.mockResolvedValueOnce(JSON.stringify(customer));
    mockKVNamespace.get.mockResolvedValueOnce(null);

    const request = new Request('https://dummy-url/billing', {
      method: 'POST',
    });
    request.customerId = customerId;

    const response = await handleGenerateInvoice(request.customerId, kvService, emailService);

    expect(response.status).toBe(404);
    expect(await response.text()).toBe('Subscription plan not found');
  });

  test('handleGenerateInvoice should return 400 if billing cycle data is missing', async () => {
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

    mockKVNamespace.get.mockResolvedValueOnce(JSON.stringify(customer));
    mockKVNamespace.get.mockResolvedValueOnce(JSON.stringify(plan));
    mockKVNamespace.get.mockResolvedValueOnce(null);

    const request = new Request('https://dummy-url/billing', {
      method: 'POST',
    });
    request.customerId = customerId;

    const response = await handleGenerateInvoice(request.customerId, kvService, emailService);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Billing cycle data not found');
  });
});