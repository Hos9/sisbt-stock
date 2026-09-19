-- Run this once in Supabase SQL Editor (adds to your existing schema).
-- Safe to re-run.

alter table public.products
  add column if not exists is_active boolean not null default true;

create index if not exists idx_products_is_active on public.products(is_active);
