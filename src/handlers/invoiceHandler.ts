import { KVService } from '../services/kvService';
import { EmailService } from '../services/emailService';
import { Invoice } from '../models/invoice';

export async function handleInvoice(request: Request, kvService: KVService, emailService: EmailService): Promise<Response> {
  try {
    const url = new URL(request.url);
    const path = url.pathname.split('/').pop();

    switch (request.method) {
      case 'GET':
        if (path === 'all') {
          return handleListAllInvoices(request, kvService);
        } else {
          return handleListCustomerInvoices(request, kvService);
        }
      case 'POST':
        return handleCreateInvoice(request, kvService, emailService);
      default:
        return new Response('Method not allowed', { status: 405 });
    }
  } catch (error) {
    console.error('Error in handleInvoice:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

async function handleGetInvoice(request: Request, kvService: KVService): Promise<Response> {
  const invoiceId = new URL(request.url).searchParams.get('invoiceId');
  const customerId = request.customerId;

  if (!invoiceId) {
    return new Response('Invoice ID is required', { status: 400 });
  }

  if (!customerId) {
    return new Response('Customer ID is required', { status: 400 });
  }

  const invoice = await kvService.getInvoice(invoiceId);
  if (!invoice) {
    return new Response('Invoice not found', { status: 404 });
  }

  if (customerId !== invoice.customer_id && !request.roles?.includes('admin')) {
    return new Response('Forbidden', { status: 403 });
  }

  return new Response(JSON.stringify(invoice), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleListCustomerInvoices(request: Request, kvService: KVService): Promise<Response> {
  const url = new URL(request.url);
  const customerId = request.customerId ?? "";
  if (!customerId) {
    return new Response('Customer ID is required', { status: 400 });
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
      return new Response('Customer ID, amount, and due date are required', { status: 400 });
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
    console.error('Error in handleCreateInvoice:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}