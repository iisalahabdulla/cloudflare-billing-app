import { KVService } from '../services/kvService';
import { EmailService } from '../services/emailService';
import { Payment } from '../models/payment';

export async function handlePaymentRetry(kvService: KVService, emailService: EmailService): Promise<Response> {
  try {
    const { payments: failedPayments, cursor } = await kvService.listPayments('failed');
    const retriedPayments = await retryFailedPayments(failedPayments, kvService, emailService);
    return new Response(`Payment retry process completed. Retried ${retriedPayments} payments.`, { status: 200 });
  } catch (error) {
    return new Response(`Error during payment retry process: ${(error as Error).message}`, { status: 500 });
  }
}

async function retryFailedPayments(failedPayments: Payment[], kvService: KVService, emailService: EmailService): Promise<number> {
  let retriedPayments = 0;

  for (const payment of failedPayments) {
    const retryResult = await retryPayment(payment, kvService, emailService);
    if (retryResult) {
      retriedPayments++;
    }
  }

  return retriedPayments;
}

async function retryPayment(payment: Payment, kvService: KVService, emailService: EmailService): Promise<boolean> {
  // Simulate payment processing (replace with actual payment gateway integration)
  const paymentStatus = Math.random() < 0.7 ? 'success' : 'failed';

  const updatedPayment: Payment = {
    ...payment,
    status: paymentStatus,
    payment_date: new Date().toISOString(),
  };

  await kvService.setPayment(updatedPayment);

  const customer = await kvService.getCustomer(payment.customer_id);
  if (!customer) {
    throw new Error('Customer not found');
  }

  if (paymentStatus === 'success') {
    await updateInvoiceStatus(payment.invoice_id, kvService);
    await emailService.sendPaymentSuccessNotification(customer.email, payment.invoice_id, payment.amount);
    return true;
  } else {
    await emailService.sendPaymentFailedNotification(customer.email, payment.invoice_id, payment.amount);
    return false;
  }
}

async function updateInvoiceStatus(invoiceId: string, kvService: KVService): Promise<void> {
  const invoice = await kvService.getInvoice(invoiceId);
  if (invoice) {
    invoice.payment_status = 'paid';
    invoice.payment_date = new Date().toISOString();
    await kvService.setInvoice(invoice);
  }
}