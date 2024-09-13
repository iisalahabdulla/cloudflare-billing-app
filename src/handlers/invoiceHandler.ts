import { KVService } from '../services/kvService';
import { EmailService } from '../services/emailService';
import { AppError, handleError } from '../utils/errorHandler';
import { Invoice } from '../models/invoice';

export async function handleInvoice(request: Request, kvService: KVService, emailService: EmailService): Promise<Response> {
  try {
    const customerId = request.customerId ?? "";
    const url = new URL(request.url);
    const invoiceId = url.searchParams.get('invoiceId');

    switch (request.method) {
      case 'GET':
        if (invoiceId) {
          return await handleGetInvoice(invoiceId, kvService);
        } else {
          return await handleListCustomerInvoices(customerId, kvService);
        }
      default:
        throw new AppError('Method not allowed', 405);
    }
  } catch (error) {
    return handleError(error);
  }
}


async function handleGetInvoice(invoiceId: string, kvService: KVService): Promise<Response> {
  const invoice = await kvService.getInvoice(invoiceId);
  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }
  return new Response(JSON.stringify(invoice), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleListCustomerInvoices(customerId: string, kvService: KVService): Promise<Response> {
  const invoices = await kvService.listInvoices(customerId);
  return new Response(JSON.stringify(invoices), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleListAllInvoices(kvService: KVService): Promise<Response> {
  const invoices = await kvService.listInvoices();
  return new Response(JSON.stringify(invoices), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleCreateInvoice(request: Request, kvService: KVService, emailService: EmailService): Promise<Response> {
  try {
    const invoiceData: Omit<Invoice, 'id'> = await request.json();

    if (!invoiceData.customer_id || !invoiceData.amount || !invoiceData.due_date) {
      throw new AppError('Customer ID, amount, and due date are required', 400);
    }

    const invoice: Invoice = {
      id: `INV-${Date.now()}-${invoiceData.customer_id}`,
      ...invoiceData,
      payment_status: invoiceData.payment_status || 'pending',
      payment_date: invoiceData.payment_date || null,
    };

    await kvService.setInvoice(invoice);

    const customer = await kvService.getCustomer(invoice.customer_id);
    if (customer) {
      await emailService.sendInvoiceNotification(customer.email, invoice.id, invoice.amount, invoice.due_date);
    }

    return new Response(JSON.stringify(invoice), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return handleError(error);
  }
}