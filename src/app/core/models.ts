export type Role = 'user' | 'agent' | 'admin' | 'trainer' | 'member';
export type TicketStatus = 'open' | 'in_progress' | 'closed';
export type Priority = 'low' | 'medium' | 'high';
export type Gender = 'femenino' | 'masculino' | 'no_binario' | 'prefiero_no_decir' | 'otro';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
  birth_date?: string | null;
  phone?: string | null;
  gender?: Gender | string | null;
  force_password_change?: boolean;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
  birth_date?: string;
  gender?: string;
  accepted_privacy_policy: boolean;
  guardian_name?: string;
  guardian_document?: string;
  guardian_phone?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  priority: Priority;
  status: TicketStatus;
  created_at: string;
  author: { id: number; name: string };
}

export interface Plan {
  id: number;
  name: string;
  slug: string;
  duration_days: number;
  daily_hours_limit?: number | null;
  description?: string | null;
  price?: number | string | null;
  price_unconfirmed?: boolean;
  is_active?: boolean;
}

export interface Product {
  id: number;
  name: string;
  sku?: string;
  category: string;
  description?: string | null;
  price?: number | string | null;
  price_unconfirmed?: boolean;
  stock_quantity?: number;
  is_active?: boolean;
}

export interface CartItem {
  id: number;
  item_type: 'plan' | 'product';
  item_id: number;
  name: string;
  detail?: string;
  description?: string | null;
  unit_price: number | null;
  price_unconfirmed: boolean;
  quantity: number;
  subtotal: number | null;
  is_active?: boolean;
  stock_quantity?: number;
}

export interface CartResponse {
  items: CartItem[];
  item_count: number;
  subtotal: number;
  total_amount: number;
  has_unconfirmed_prices: boolean;
  unconfirmed_items_count: number;
  can_checkout: boolean;
}

export interface OrderItem {
  id: number;
  order_id?: number;
  item_type: 'plan' | 'product';
  item_id: number;
  item_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: number;
  order_number: string;
  user_id: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'pending_verification' | 'approved' | 'rejected' | string;
  total_amount: number | string;
  payment_method: string;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
  items?: OrderItem[];
}

export interface Membership {
  id: number;
  member_id?: number;
  user_id?: number;
  plan_id?: number;
  plan_name?: string;
  raw_plan_name?: string;
  slug?: string;
  start_date: string;
  end_date: string;
  duration_days?: number;
  duration?: string;
  price_registered?: number;
  price_paid?: number;
  order_number?: string;
  payment_status?: string;
  days_remaining?: number;
  is_simulated?: boolean;
  status: 'active' | 'expired' | 'cancelled' | 'pending_payment' | string;
  notes?: string | null;
}

export interface ActiveMembershipResponse {
  active: boolean;
  membership: Membership | null;
  message?: string;
}

export interface BankAccount {
  id: number;
  bank_name: string;
  account_type: string;
  account_number: string;
  account_holder: string;
  document_type: string;
  document_number: string;
  is_active: boolean;
  instructions?: string | null;
}

export interface PaymentRecord {
  id: number;
  order_id: number;
  payment_method: string;
  amount: number | string;
  status: 'pending_verification' | 'approved' | 'rejected' | 'pending' | 'completed' | string;
  verified_by?: number | null;
  verified_at?: string | null;
  rejection_reason?: string | null;
  receipt_original_name?: string | null;
  receipt_mime_type?: string | null;
  receipt_size_bytes?: number | null;
  has_receipt?: boolean;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  order_number?: string;
  plan_name?: string;
  verifier_name?: string;
  created_at: string;
  updated_at?: string;
}

export interface BulkActionResult {
  success: boolean;
  processed: number[];
  omitted: { id: number; reason: string }[];
  count: number;
  message: string;
}

