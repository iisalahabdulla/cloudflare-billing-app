import { handleGenerateInvoice } from '../handlers/billingHandler';
import { KVService } from '../services/kvService';
import { EmailService } from '../services/emailService';
import { Customer } from '../models/customer';
import { SubscriptionPlan } from '../models/subscriptionPlan';

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

  beforeEach(() => {
    kvService = new KVService({
      CUSTOMERS: mockKVNamespace as unknown as KVNamespace,
      SUBSCRIPTIONS: mockKVNamespace as unknown as KVNamespace,
      INVOICES: mockKVNamespace as unknown as KVNamespace,
      PAYMENTS: mockKVNamespace as unknown as KVNamespace,
    });
    emailService = mockEmailService as unknown as EmailService;
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

    const response = await handleGenerateInvoice(customerId, kvService, emailService);

    expect(response.status).toBe(201);
    const responseBody = await response.json() as { id: string; customer_id: string; amount: number };
    expect(responseBody).toHaveProperty('id');
    expect(responseBody.customer_id).toBe(customerId);
    expect(responseBody.amount).toBe(plan.price);
    expect(mockEmailService.sendInvoiceNotification).toHaveBeenCalled();
  });
});