export interface Invoice {
  id: string;
  customer_id: string;
  amount: number;
  due_date: string; // ISO 8601 date string
  payment_status: 'pending' | 'paid' | 'overdue';
  payment_date: string | null; // ISO 8601 date string or null if not paid
}