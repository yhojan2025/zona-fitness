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
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  total_amount: number | string;
  payment_method: string;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
  items?: OrderItem[];
}

export interface Membership {
  id: number;
  member_id: number;
  plan_id: number;
  plan_name?: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending_payment';
  notes?: string | null;
}
