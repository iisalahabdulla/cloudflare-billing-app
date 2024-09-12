export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  billing_cycle: 'monthly' | 'quarterly' | 'yearly';
  features: string[];
  status: 'active' | 'inactive';
}