export interface Customer {
  id: string;
  name: string;
  email: string;
  password?: string;
  subscription_plan_id: string | null;
  subscription_status: 'active' | 'inactive' | 'pending' | 'cancelled';
  subscription_start_date: string | null; // ISO 8601 date string
  subscription_end_date: string | null; // ISO 8601 date string
  roles?: string[]; // Add roles
}