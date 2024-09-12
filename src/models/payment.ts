export interface Payment {
  id: string;
  invoice_id: string;
  customer_id: string;
  amount: number;
  payment_method: 'credit_card' | 'bank_transfer' | 'paypal' | 'other';
  payment_date: string; // ISO 8601 date string
  status: 'success' | 'failed' | 'pending';
}