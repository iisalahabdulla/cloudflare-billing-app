import { KVService } from '../services/kvService';
import { EmailService } from '../services/emailService';
import { AppError, handleError } from '../utils/errorHandler';
import { Payment } from '../models/payment';

export async function handlePayment(request: Request, kvService: KVService, emailService: EmailService): Promise<Response> {
  try {
    const url = new URL(request.url);
    const invoiceId = url.searchParams.get('invoiceId');
    switch (request.method) {
      case 'POST':
        if (!invoiceId) {
          throw new AppError('Invoice ID is required for payment', 400);
        }
        return await handleProcessPayment(invoiceId, request, kvService, emailService);
      default:
        throw new AppError('Method not allowed', 405);
    }
  } catch (error) {
    return handleError(error);
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

export async function handleProcessPayment(invoiceId: string, request: Request, kvService: KVService, emailService: EmailService): Promise<Response> {
  try {
    const paymentData: Omit<Payment, 'id' | 'status'> = await request.json();
    const customerId = request.customerId ?? "";
    const email = request.email ?? "";

    // Validate payment data
    if (!invoiceId || !customerId || !paymentData.amount || !paymentData.payment_method) {
      return new Response('Invalid payment data', { status: 400 });
    }

    const customer = await kvService.getCustomer(customerId);
    console.log({ customer });
    if (!customer) {
      return new Response('Customer not found', { status: 404 });
    }

    const invoice = await kvService.getInvoice(invoiceId);
    if (!invoice) {
      return new Response('Invoice not found', { status: 404 });
    }

    // Check if payment amount is sufficient
    if (paymentData.amount < invoice.amount) {
      await emailService.sendPaymentFailedNotification(email, invoiceId, paymentData.amount);
      return new Response('Payment failed due to insufficient funds', { status: 402 });
    }

    // Process the payment (in a real-world scenario, you'd integrate with a payment gateway here)
    const paymentStatus = await processPayment(paymentData);

    const payment: Payment = {
      id: `PAY-${Date.now()}-${customerId}`,
      ...paymentData,
      payment_date: new Date().toISOString(),
      status: paymentStatus,
    };

    await kvService.setPayment(payment);

    if (paymentStatus === 'success') {
      await updateInvoiceStatus(invoiceId, kvService);
      await emailService.sendPaymentSuccessNotification(email, payment.invoice_id, payment.amount);
      return new Response(JSON.stringify(payment), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      await emailService.sendPaymentFailedNotification(email, payment.invoice_id, payment.amount);
      return new Response('Payment failed', { status: 402 });
    }
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

async function handleGetPaymentWithPagination(request: Request, kvService: KVService): Promise<Response> {
  const url = new URL(request.url);
  const paymentId = url.searchParams.get('id');

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
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const cursor = url.searchParams.get('cursor') || undefined;
    const { payments, cursor: nextCursor } = await kvService.listPayments(undefined, limit, cursor);
    return new Response(JSON.stringify({ payments, nextCursor }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function handleListPayments(request: Request, kvService: KVService): Promise<Response> {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const cursor = url.searchParams.get('cursor') || undefined;
    const status = url.searchParams.get('status') as Payment['status'] | undefined;

    const { payments, cursor: nextCursor } = await kvService.listPayments(status, limit, cursor);

    return new Response(JSON.stringify({ payments, nextCursor }), {
        headers: { 'Content-Type': 'application/json' },
    });
}