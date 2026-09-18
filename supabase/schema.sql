-- ============================================================================
-- NetStock — ISP Inventory & Stock Management
-- Full database schema: tables, indexes, RLS policies, and RPC functions.
--
-- Run this entire file once in the Supabase SQL Editor (Project → SQL Editor
-- → New query) on a fresh project. It is safe to re-run: objects are created
-- with IF NOT EXISTS / OR REPLACE where possible.
-- ============================================================================

-- Needed for gen_random_uuid(); enabled by default on Supabase projects.
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. TABLES
-- ----------------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null default 'staff' check (role in ('admin', 'staff')),
  created_at  timestamptz not null default now()
);

create table if not exists public.categories (
  id             uuid primary key default gen_random_uuid(),
  category_name  text not null unique,
  created_at     timestamptz not null default now()
);

create table if not exists public.products (
  id               uuid primary key default gen_random_uuid(),
  sku              text not null unique,
  product_name     text not null,
  category_id      uuid references public.categories(id) on delete set null,
  brand            text,
  unit             text not null default 'pcs',
  purchase_price   numeric(12,2) not null default 0,
  selling_price    numeric(12,2) not null default 0,
  current_stock    numeric(12,2) not null default 0,
  minimum_stock    numeric(12,2) not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.stock_movements (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null references public.products(id) on delete cascade,
  movement_type     text not null check (movement_type in ('IN', 'OUT', 'ADJUSTMENT')),
  quantity          numeric(12,2) not null,
  previous_stock    numeric(12,2) not null,
  new_stock         numeric(12,2) not null,
  reference_number  text,
  notes             text,
  created_by        uuid references public.profiles(id),
  created_at        timestamptz not null default now()
);

create table if not exists public.app_settings (
  id                    int primary key default 1 check (id = 1),
  allow_negative_stock  boolean not null default false
);
insert into public.app_settings (id, allow_negative_stock)
  values (1, false)
  on conflict (id) do nothing;

create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_movements_product on public.stock_movements(product_id);
create index if not exists idx_movements_created_at on public.stock_movements(created_at desc);
create index if not exists idx_movements_type on public.stock_movements(movement_type);

-- ----------------------------------------------------------------------------
-- 2. HELPER FUNCTIONS
-- ----------------------------------------------------------------------------

-- Returns true if the current authenticated user is an admin. Marked
-- SECURITY DEFINER so it can read `profiles` without recursing through the
-- RLS policy that itself calls this function.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- Keeps products.updated_at current on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- Automatically creates a profile row (default role: staff) whenever a new
-- user signs up via Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'staff')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

alter table public.profiles       enable row level security;
alter table public.categories     enable row level security;
alter table public.products       enable row level security;
alter table public.stock_movements enable row level security;
alter table public.app_settings   enable row level security;

-- profiles: a user can read their own row; admins can read every row.
-- Only admins can change roles.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- categories: any signed-in user can read; only admins can write.
drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories
  for select using (auth.uid() is not null);

drop policy if exists categories_write_admin on public.categories;
create policy categories_write_admin on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- products: any signed-in user can read. Only admins can insert/update/
-- delete product records directly (price, name, category, minimum stock…).
-- current_stock changes made by staff happen only through the fn_stock_in /
-- fn_stock_out functions below, which run with elevated privileges.
drop policy if exists products_select on public.products;
create policy products_select on public.products
  for select using (auth.uid() is not null);

drop policy if exists products_write_admin on public.products;
create policy products_write_admin on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- stock_movements: any signed-in user can read the movement history.
-- No INSERT/UPDATE/DELETE policy is defined for regular clients — the only
-- way to create a movement is through the SECURITY DEFINER functions below,
-- which insert as the function owner and bypass this table's RLS by design.
drop policy if exists movements_select on public.stock_movements;
create policy movements_select on public.stock_movements
  for select using (auth.uid() is not null);

revoke insert, update, delete on public.stock_movements from authenticated, anon;
grant select on public.stock_movements to authenticated;

-- app_settings: any signed-in user can read; only admins can change it.
drop policy if exists settings_select on public.app_settings;
create policy settings_select on public.app_settings
  for select using (auth.uid() is not null);

drop policy if exists settings_update_admin on public.app_settings;
create policy settings_update_admin on public.app_settings
  for update using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 4. STOCK MOVEMENT FUNCTIONS
--    SECURITY DEFINER so a signed-in "staff" user (who has no direct write
--    grant on products/stock_movements) can still record a sale or purchase.
--    Each function re-checks auth.uid() itself, so it can never be called by
--    an anonymous/unauthenticated request.
-- ----------------------------------------------------------------------------

create or replace function public.fn_stock_in(
  p_product_id        uuid,
  p_quantity          numeric,
  p_reference_number  text default null,
  p_notes             text default null,
  p_supplier          text default null,
  p_unit_price        numeric default null
)
returns table(new_stock numeric)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_previous numeric;
  v_new      numeric;
  v_notes    text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  select current_stock into v_previous from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Product not found';
  end if;

  v_new := v_previous + p_quantity;
  v_notes := trim(both ' ' from
    coalesce(p_notes, '') ||
    case when p_supplier is not null and p_supplier <> '' then ' | Supplier: ' || p_supplier else '' end ||
    case when p_unit_price is not null then ' | Unit price: ' || p_unit_price::text else '' end
  );

  update public.products set current_stock = v_new where id = p_product_id;

  insert into public.stock_movements
    (product_id, movement_type, quantity, previous_stock, new_stock, reference_number, notes, created_by)
  values
    (p_product_id, 'IN', p_quantity, v_previous, v_new, p_reference_number, nullif(v_notes, ''), auth.uid());

  return query select v_new;
end;
$$;

create or replace function public.fn_stock_out(
  p_product_id        uuid,
  p_quantity          numeric,
  p_reference_number  text default null,
  p_notes             text default null,
  p_customer          text default null,
  p_unit_price        numeric default null
)
returns table(new_stock numeric)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_previous       numeric;
  v_new            numeric;
  v_allow_negative boolean;
  v_notes          text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  select current_stock into v_previous from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Product not found';
  end if;

  select allow_negative_stock into v_allow_negative from public.app_settings where id = 1;
  v_new := v_previous - p_quantity;

  if v_new < 0 and not coalesce(v_allow_negative, false) then
    raise exception 'Insufficient stock. Available: %', v_previous;
  end if;

  v_notes := trim(both ' ' from
    coalesce(p_notes, '') ||
    case when p_customer is not null and p_customer <> '' then ' | Customer: ' || p_customer else '' end ||
    case when p_unit_price is not null then ' | Unit price: ' || p_unit_price::text else '' end
  );

  update public.products set current_stock = v_new where id = p_product_id;

  insert into public.stock_movements
    (product_id, movement_type, quantity, previous_stock, new_stock, reference_number, notes, created_by)
  values
    (p_product_id, 'OUT', p_quantity, v_previous, v_new, p_reference_number, nullif(v_notes, ''), auth.uid());

  return query select v_new;
end;
$$;

create or replace function public.fn_stock_adjustment(
  p_product_id  uuid,
  p_new_stock   numeric,
  p_notes       text default null
)
returns table(new_stock numeric)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_previous numeric;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_admin() then
    raise exception 'Only administrators can adjust stock directly';
  end if;
  if p_new_stock is null or p_new_stock < 0 then
    raise exception 'New stock cannot be negative';
  end if;

  select current_stock into v_previous from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Product not found';
  end if;

  update public.products set current_stock = p_new_stock where id = p_product_id;

  insert into public.stock_movements
    (product_id, movement_type, quantity, previous_stock, new_stock, reference_number, notes, created_by)
  values
    (p_product_id, 'ADJUSTMENT', p_new_stock - v_previous, v_previous, p_new_stock, null, p_notes, auth.uid());

  return query select p_new_stock;
end;
$$;

grant execute on function public.fn_stock_in(uuid, numeric, text, text, text, numeric) to authenticated;
grant execute on function public.fn_stock_out(uuid, numeric, text, text, text, numeric) to authenticated;
grant execute on function public.fn_stock_adjustment(uuid, numeric, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 5. PROMOTE YOUR FIRST ADMIN
--    After you sign up your first user from the Login page (or invite one
--    from Authentication → Users in the Supabase dashboard), run this once,
--    replacing the email address:
--
--    update public.profiles set role = 'admin'
--      where id = (select id from auth.users where email = 'you@example.com');
-- ----------------------------------------------------------------------------
