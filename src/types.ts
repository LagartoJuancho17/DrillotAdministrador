export type Category = 'marco' | 'lamina' | 'accesorio';
export type OrderStatus = 'pendiente' | 'confirmado' | 'en_preparacion' | 'en_camino' | 'entregado' | 'cancelado' | 'en_reclamo';
export type ClientCategory = 'nuevo' | 'regular' | 'vip' | 'mayorista';
export type PaymentStatus = 'pendiente' | 'parcial' | 'pagado';

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  category: Category;
  description: string | null;
  image_url: string | null;
  cost_price: number;
  sale_price: number;
  wholesale_price: number;
  stock_actual: number;
  stock_minimo: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  client_number: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  address: string | null;
  category: ClientCategory;
  notes: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  client_id: string | null;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  shipping_cost: number;
  total: number;
  payment_method: string | null;
  payment_status: PaymentStatus;
  internal_notes: string | null;
  client_notes: string | null;
  created_at: string;
  updated_at: string;
  client?: Client;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  size?: string;
  product?: Product;
}

export interface ShippingInfo {
  id: string;
  order_id: string;
  provider: string | null;
  tracking_number: string | null;
  shipping_status: string;
  shipped_at: string | null;
  delivered_at: string | null;
  destination_address: string | null;
  cost: number;
  is_pickup: boolean;
}

export interface AdSpend {
  id: string;
  date: string;
  end_date?: string;
  platform: string;
  type: 'Publicación' | 'Story';
  amount: number;
  impressions: number | null;
  clicks: number | null;
  created_at: string;
}

export interface Supply {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
  purchase_date: string;
  created_at: string;
}

export interface SupplyShortcut {
  id: string;
  name: string;
  default_unit: string;
  created_at: string;
}
