import { KVService } from '../services/kvService';
import { EmailService } from '../services/emailService';
import { Invoice } from '../models/invoice';

export async function handlePaymentRetry(kvService: KVService, emailService: EmailService): Promise<void> {
    try {
        const { invoices } = await kvService.listInvoices(undefined, 1000); // Fetch up to 1000 invoices
        const overdueInvoices = invoices.filter(invoice => 
            invoice.payment_status === 'pending' && new Date(invoice.due_date) < new Date()
        );

        for (const invoice of overdueInvoices) {
            await retryPayment(invoice, kvService, emailService);
        }
    } catch (error) {
        console.error('Error in handlePaymentRetry:', error);
    }
}

async function retryPayment(invoice: Invoice, kvService: KVService, emailService: EmailService): Promise<void> {
    try {
        const customer = await kvService.getCustomer(invoice.customer_id);
        if (!customer) {
            console.error(`Customer not found for invoice ${invoice.id}`);
            return;
        }

        // Update this line to match the expected method signature
        await emailService.sendPaymentFailedNotification(customer.email, invoice.id, invoice.amount);

        console.log(`Payment retry attempted for invoice ${invoice.id}`);
    } catch (error) {
        console.error(`Error retrying payment for invoice ${invoice.id}:`, error);
    }
}