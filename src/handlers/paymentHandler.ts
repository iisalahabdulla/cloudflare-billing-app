import { KVService } from '../services/kvService';
import { EmailService } from '../services/emailService';
import { Payment } from '../models/payment';
import { handleError } from '../utils/errorHandler';

export async function handlePayment(request: Request, kvService: KVService, emailService: EmailService): Promise<Response> {
  const url = new URL(request.url);
  const paymentId = url.searchParams.get('id');

  switch (request.method) {
    case 'GET':
      return handleGetPayment(paymentId, kvService);
    case 'POST':
      return handleProcessPayment(request, kvService, emailService);
    default:
      return new Response('Method not allowed', { status: 405 });
  }
}

async function handleGetPayment(paymentId: string | null, kvService: KVService): Promise<Response> {
  if (paymentId) {
    const payment = await kvService.getPayment(paymentId);
    if (payment) {
      return new Response(JSON.stringify(payment), {
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      return new Response('Payment not found', { status: 404 });
    }
  } else {
    const payments = await kvService.listPayments();
    return new Response(JSON.stringify(payments), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleProcessPayment(request: Request, kvService: KVService, emailService: EmailService): Promise<Response> {
  try {
    const paymentData: Omit<Payment, 'id' | 'status'> = await request.json();
    
    // Validate payment data
    if (!paymentData.invoice_id || !paymentData.customer_id || !paymentData.amount || !paymentData.payment_method) {
      return new Response('Invalid payment data', { status: 400 });
    }

    // Process the payment (in a real-world scenario, you'd integrate with a payment gateway here)
    const paymentStatus = await processPayment(paymentData);

    const payment: Payment = {
      id: `PAY-${Date.now()}-${paymentData.customer_id}`,
      ...paymentData,
      payment_date: new Date().toISOString(),
      status: paymentStatus,
    };

    await kvService.setPayment(payment);

    const customer = await kvService.getCustomer(payment.customer_id);
    if (!customer) {
      throw new Error('Customer not found');
    }

    if (paymentStatus === 'success') {
      await updateInvoiceStatus(paymentData.invoice_id, kvService);
      await emailService.sendPaymentSuccessNotification(customer.email, payment.invoice_id, payment.amount);
    } else {
      await emailService.sendPaymentFailedNotification(customer.email, payment.invoice_id, payment.amount);
    }

    return new Response(JSON.stringify(payment), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return handleError(error);
  }
}

async function processPayment(paymentData: Omit<Payment, 'id' | 'status'>): Promise<Payment['status']> {
  // Simulate payment processing
  // In a real-world scenario, you'd integrate with a payment gateway here
  return Math.random() < 0.9 ? 'success' : 'failed';
}

async function updateInvoiceStatus(invoiceId: string, kvService: KVService): Promise<void> {
  const invoice = await kvService.getInvoice(invoiceId);
  if (invoice) {
    invoice.payment_status = 'paid';
    invoice.payment_date = new Date().toISOString();
    await kvService.setInvoice(invoice);
  }
}