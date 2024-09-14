import { KVService } from '../services/kvService';
import { EmailService } from '../services/emailService';
import { Payment } from '../models/payment';

export async function handlePayment(request: Request, kvService: KVService, emailService: EmailService): Promise<Response> {
	try {
		const url = new URL(request.url);
		const path = url.pathname.split('/').pop();

		switch (request.method) {
			case 'GET':
				if (path === 'all') {
					return handleListAllPayments(request, kvService);
				} else {
					return handleGetPayment(request, kvService);
				}
			case 'POST':
				return handleCreatePayment(request, kvService, emailService);
			default:
				return new Response('Method not allowed', { status: 405 });
		}
	} catch (error) {
		console.error('Error in handlePayment:', error);
		return new Response('Internal Server Error', { status: 500 });
	}
}

async function handleGetPayment(request: Request, kvService: KVService): Promise<Response> {
	const url = new URL(request.url);
	const paymentId = url.searchParams.get('paymentId');
	if (!paymentId) {
		return new Response('Payment ID is required', { status: 400 });
	}

	const payment = await kvService.getPayment(paymentId);
	if (!payment) {
		return new Response('Payment not found', { status: 404 });
	}

	return new Response(JSON.stringify(payment), {
		headers: { 'Content-Type': 'application/json' },
	});
}

async function handleListAllPayments(request: Request, kvService: KVService): Promise<Response> {
	const url = new URL(request.url);
	const limit = parseInt(url.searchParams.get('limit') || '10');
	const cursor = url.searchParams.get('cursor') || undefined;
	const status = url.searchParams.get('status') as Payment['status'] | undefined;

	const { payments, cursor: nextCursor } = await kvService.listPayments(status, limit, cursor);

	return new Response(JSON.stringify({ payments, nextCursor }), {
		headers: { 'Content-Type': 'application/json' },
	});
}

async function handleCreatePayment(request: Request, kvService: KVService, emailService: EmailService): Promise<Response> {
	const paymentData: Omit<Payment, 'id'> = await request.json();

	if (!paymentData.invoice_id || !paymentData.amount || !paymentData.payment_method) {
		return new Response('Invoice ID, amount, and payment method are required', { status: 400 });
	}

	const invoice = await kvService.getInvoice(paymentData.invoice_id);
	if (!invoice) {
		return new Response('Invoice not found', { status: 404 });
	}

	if (invoice.payment_status === 'paid') {
		return new Response('Invoice has already been paid', { status: 400 });
	}

	const payment: Payment = {
		id: `PAY-${Date.now()}`,
		...paymentData,
		status: 'success', // Change 'successful' to 'success'
		payment_date: new Date().toISOString(), // Change 'created_at' to 'payment_date'
	};

	await kvService.setPayment(payment);

	// Update invoice status
	invoice.payment_status = 'paid';
	invoice.payment_date = payment.payment_date;
	await kvService.setInvoice(invoice);

	// Send payment confirmation email
	const customer = await kvService.getCustomer(invoice.customer_id);
	if (customer) {
		await emailService.sendPaymentSuccessNotification(customer.email, payment.id, payment.amount);
	}

	return new Response(JSON.stringify(payment), {
		status: 201,
		headers: { 'Content-Type': 'application/json' },
	});
}