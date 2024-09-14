import { KVService } from '../services/kvService';
import { EmailService } from '../services/emailService';
import { AppError, handleError } from '../utils/errorHandler';
import { Invoice } from '../models/invoice';

export async function handleInvoice(request: Request, kvService: KVService, emailService: EmailService): Promise<Response> {
  try {
    const url = new URL(request.url);
    const invoiceId = url.searchParams.get('invoiceId');

    switch (request.method) {
      case 'GET':
        if (invoiceId) {
          return await handleGetInvoice(request, kvService);
        } else if (url.searchParams.get('customerId')) {
          return await handleListCustomerInvoices(request, kvService);
        } else if (request.roles?.includes('admin')) {
          return await handleListAllInvoices(request, kvService);
        }
      default:
        throw new AppError('Method not allowed', 405);
    }
  } catch (error) {
    return handleError(error);
  }
}


async function handleGetInvoice(request: Request, kvService: KVService): Promise<Response> {
  const invoiceId = new URL(request.url).searchParams.get('invoiceId');
  const customerId = request.customerId;

  if (!invoiceId) {
    throw new AppError('Invoice ID is required', 400);
  }

  if (!customerId) {
    throw new AppError('Customer ID is required', 400);
  }

  const invoice = await kvService.getInvoice(invoiceId);
  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  if (customerId !== invoice.customer_id && !request.roles?.includes('admin')) {
    throw new AppError('Forbidden', 403);
  }

  return new Response(JSON.stringify(invoice), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleListCustomerInvoices(request: Request, kvService: KVService): Promise<Response> {
  const url = new URL(request.url);
  const customerId = request.customerId ?? "";
  if (!customerId) {
    throw new AppError('Customer ID is required', 400);
  }
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const cursor = url.searchParams.get('cursor') || undefined;
  const { invoices, cursor: nextCursor } = await kvService.listInvoices(customerId, limit, cursor);
  return new Response(JSON.stringify({ invoices, nextCursor }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleListAllInvoices(request: Request, kvService: KVService): Promise<Response> {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const cursor = url.searchParams.get('cursor') || undefined;
  const { invoices, cursor: nextCursor } = await kvService.listInvoices(undefined, limit, cursor);
  return new Response(JSON.stringify({ invoices, nextCursor }), {
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