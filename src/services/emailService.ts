interface EmailData {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export class EmailService {
  private apiKey: string;
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string) {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
  }

  async sendEmail(emailData: EmailData): Promise<void> {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: emailData.to }] }],
        from: { email: this.fromEmail },
        subject: emailData.subject,
        content: [
          { type: 'text/plain', value: emailData.text },
          { type: 'text/html', value: emailData.html },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send email: ${response.statusText}`);
    }
  }

  async sendInvoiceNotification(to: string, invoiceId: string, amount: number, dueDate: string): Promise<void> {
    const subject = `New Invoice Generated - ${invoiceId}`;
    const text = `A new invoice (${invoiceId}) for $${amount} has been generated. It is due on ${dueDate}.`;
    const html = `<p>A new invoice (${invoiceId}) for $${amount} has been generated. It is due on ${dueDate}.</p>`;

    await this.sendEmail({ to, subject, text, html });
  }

  async sendPaymentSuccessNotification(to: string, invoiceId: string, amount: number): Promise<void> {
    const subject = `Payment Successful - Invoice ${invoiceId}`;
    const text = `Your payment of $${amount} for invoice ${invoiceId} has been successfully processed.`;
    const html = `<p>Your payment of $${amount} for invoice ${invoiceId} has been successfully processed.</p>`;

    await this.sendEmail({ to, subject, text, html });
  }

  async sendPaymentFailedNotification(to: string, invoiceId: string, amount: number): Promise<void> {
    const subject = `Payment Failed - Invoice ${invoiceId}`;
    const text = `Your payment of $${amount} for invoice ${invoiceId} has failed. Please update your payment method and try again.`;
    const html = `<p>Your payment of $${amount} for invoice ${invoiceId} has failed. Please update your payment method and try again.</p>`;

    await this.sendEmail({ to, subject, text, html });
  }
}