# FrameFlow - Supabase Setup

Run the following SQL in your Supabase SQL Editor to set up the database schema.

```sql
-- Profiles table for users
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone
);

-- Products (Frames and Prints)
create table products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  sku text unique,
  category text check (category in ('marco', 'lamina', 'accesorio')),
  description text,
  image_url text,
  cost_price decimal(12,2) default 0,
  sale_price decimal(12,2) default 0,
  wholesale_price decimal(12,2) default 0,
  stock_actual integer default 0,
  stock_minimo integer default 0,
  active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Clients
create table clients (
  id uuid default gen_random_uuid() primary key,
  client_number text unique,
  name text not null,
  phone text,
  email text,
  instagram text,
  address text,
  category text check (category in ('nuevo', 'regular', 'vip', 'mayorista')) default 'nuevo',
  notes text,
  created_at timestamp with time zone default now()
);

-- Orders
create table orders (
  id uuid default gen_random_uuid() primary key,
  order_number text unique not null,
  client_id uuid references clients(id) on delete cascade,
  status text check (status in ('pendiente', 'confirmado', 'en_preparacion', 'en_camino', 'entregado', 'cancelado', 'en_reclamo')) default 'pendiente',
  subtotal decimal(12,2) default 0,
  discount decimal(12,2) default 0,
  shipping_cost decimal(12,2) default 0,
  total decimal(12,2) default 0,
  payment_method text,
  payment_status text check (payment_status in ('pendiente', 'parcial', 'pagado')) default 'pendiente',
  internal_notes text,
  client_notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Order Items
create table order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id),
  quantity integer not null,
  unit_price decimal(12,2) not null,
  total_price decimal(12,2) not null,
  size text
);

-- Shipping Info
create table shipping_info (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references orders(id) on delete cascade,
  provider text, -- Andreani, OCA, etc.
  tracking_number text,
  shipping_status text default 'pendiente',
  shipped_at timestamp with time zone,
  delivered_at timestamp with time zone,
  destination_address text,
  cost decimal(12,2) default 0,
  is_pickup boolean default false
);

-- Ad Spend (Marketing)
create table ad_spend (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  end_date date,
  platform text default 'Instagram',
  type text default 'Publicación', -- Publicación o Story
  amount decimal(12,2) not null,
  impressions integer default 0,
  clicks integer default 0,
  created_at timestamp with time zone default now()
);

-- Supplies (Insumos)
create table supplies (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  quantity decimal(12,2) not null,
  unit text not null, -- kg, m, unidad, etc.
  unit_cost decimal(12,2) not null,
  total_cost decimal(12,2) not null,
  purchase_date date not null,
  created_at timestamp with time zone default now()
);

-- Supply Shortcuts (Atajos de Insumos)
create table supply_shortcuts (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  default_unit text default 'unidad',
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table profiles enable row level security;
alter table products enable row level security;
alter table clients enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table shipping_info enable row level security;
alter table ad_spend enable row level security;
alter table supplies enable row level security;
alter table supply_shortcuts enable row level security;

-- Basic Policies (Allow all access for now to simplify setup without Supabase Auth)
create policy "Allow all for everyone" on profiles for all using (true);
create policy "Allow all for everyone" on products for all using (true);
create policy "Allow all for everyone" on clients for all using (true);
create policy "Allow all for everyone" on orders for all using (true);
create policy "Allow all for everyone" on order_items for all using (true);
create policy "Allow all for everyone" on shipping_info for all using (true);
create policy "Allow all for everyone" on ad_spend for all using (true);
create policy "Allow all for everyone" on supplies for all using (true);
create policy "Allow all for everyone" on supply_shortcuts for all using (true);

-- Initial Shortcuts
insert into supply_shortcuts (name) values 
  ('Cuadro A4'), ('Cuadro A3'), ('Cuadro 40x50'), ('Cuadro 50x60'),
  ('Lamina A4'), ('Lamina A3'), ('Lamina 40x50'), ('Lamina 50x60')
on conflict (name) do nothing;
```
