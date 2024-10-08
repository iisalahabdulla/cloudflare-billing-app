import { handlePayment } from '../handlers/paymentHandler';
import { KVService } from '../services/kvService';
import { EmailService } from '../services/emailService';
import { Customer } from '../models/customer';
import { Invoice } from '../models/invoice';
import { Env } from '../types/env';

// Mock KVNamespace and EmailService
const mockKVNamespace = {
  get: jest.fn(),
  put: jest.fn(),
  list: jest.fn(),
  delete: jest.fn(),
};

const mockEmailService = {
  sendPaymentSuccessNotification: jest.fn(),
};

describe('Payment Processing', () => {
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

  test('handlePayment should process a successful payment', async () => {
    const customerId = 'customer1';
    const invoiceId = 'invoice1';
    const customer: Customer = {
      id: customerId,
      name: 'Test Customer',
      email: 'test@example.com',
      subscription_plan_id: 'plan1',
      subscription_status: 'active',
      subscription_start_date: '2023-01-01T00:00:00Z',
      subscription_end_date: '2023-02-01T00:00:00Z',
    };
    const invoice: Invoice = {
      id: invoiceId,
      customer_id: customerId,
      amount: 9.99,
      due_date: '2023-02-01T00:00:00Z',
      payment_status: 'pending',
      payment_date: null,
    };

    mockKVNamespace.get.mockResolvedValueOnce(JSON.stringify(invoice));
    mockKVNamespace.get.mockResolvedValueOnce(JSON.stringify(customer));
    mockKVNamespace.put.mockResolvedValue(undefined);

    const paymentData = {
      invoice_id: invoiceId,
      amount: 9.99,
      payment_method: 'credit_card',
    };

    const request = new Request('https://dummy-url/payment', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });

    const response = await handlePayment(request, kvService, emailService);

    expect(response.status).toBe(201);
    const responseBody = await response.json() as { id: string; status: string };
    expect(responseBody).toHaveProperty('id');
    expect(responseBody.status).toBe('success');
    expect(mockEmailService.sendPaymentSuccessNotification).toHaveBeenCalled();
  });

  test('handlePayment should return 404 if invoice does not exist', async () => {
    const invoiceId = 'nonexistent-invoice';

    mockKVNamespace.get.mockResolvedValueOnce(null);

    const paymentData = {
      invoice_id: invoiceId,
      amount: 9.99,
      payment_method: 'credit_card',
    };

    const request = new Request('https://dummy-url/payment', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });

    const response = await handlePayment(request, kvService, emailService);

    expect(response.status).toBe(404);
    expect(await response.text()).toBe('Invoice not found');
  });

  test('handlePayment should return 400 if invoice has already been paid', async () => {
    const invoiceId = 'invoice1';
    const invoice: Invoice = {
      id: invoiceId,
      customer_id: 'customer1',
      amount: 9.99,
      due_date: '2023-02-01T00:00:00Z',
      payment_status: 'paid',
      payment_date: '2023-01-15T00:00:00Z',
    };

    mockKVNamespace.get.mockResolvedValueOnce(JSON.stringify(invoice));

    const paymentData = {
      invoice_id: invoiceId,
      amount: 9.99,
      payment_method: 'credit_card',
    };

    const request = new Request('https://dummy-url/payment', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });

    const response = await handlePayment(request, kvService, emailService);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invoice has already been paid');
  });
});