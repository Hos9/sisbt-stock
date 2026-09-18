-- ============================================================================
-- Optional sample data — ISP / network equipment.
-- Run AFTER schema.sql. Safe to skip entirely if you'd rather start empty.
-- ============================================================================

insert into public.categories (category_name) values
  ('Networking Devices'),
  ('Fiber Optic Cable'),
  ('Connectors & Patch Cords'),
  ('Splitters & Splicing'),
  ('Accessories'),
  ('Power & Backup')
on conflict (category_name) do nothing;

-- Products reference categories by name so this file works on a fresh
-- database regardless of generated UUIDs.
with cat as (
  select id, category_name from public.categories
)
insert into public.products
  (sku, product_name, category_id, brand, unit, purchase_price, selling_price, current_stock, minimum_stock)
select v.sku, v.product_name, cat.id, v.brand, v.unit, v.purchase_price, v.selling_price, v.current_stock, v.minimum_stock
from (values
  ('ONU-001',        'GPON ONU — Single Port',            'Networking Devices',        'Generic',   'pcs',  1800, 2500, 40, 10),
  ('ONU-002',        'GPON ONU — 4-Port Wi-Fi',            'Networking Devices',        'Generic',   'pcs',  3200, 4200, 25, 8),
  ('MC-FE',          'Fiber-to-Ethernet Media Converter',  'Networking Devices',        'Generic',   'pcs',  900,  1300, 15, 5),
  ('SW-8P',          '8-Port Unmanaged Switch',             'Networking Devices',        'Generic',   'pcs',  1200, 1700, 12, 4),
  ('FIB-SM1C',       'Single-Mode Fiber Cable (1 Core)',    'Fiber Optic Cable',         'Generic',   'meter',12,   20,   3000, 500),
  ('FIB-DROP2C',     'Fiber Drop Cable (2 Core)',           'Fiber Optic Cable',         'Generic',   'meter',15,   25,   2500, 500),
  ('PC-SCUPC-3M',    'Patch Cord SC/UPC 3m',                'Connectors & Patch Cords',  'Generic',   'pcs',  90,   150,  120, 20),
  ('PC-SCAPC-3M',    'Patch Cord SC/APC 3m',                'Connectors & Patch Cords',  'Generic',   'pcs',  95,   160,  120, 20),
  ('CONN-SCAPC-FAST','SC/APC Fast Connector',               'Connectors & Patch Cords',  'Generic',   'pcs',  35,   60,   300, 50),
  ('PIG-SCAPC',      'Fiber Pigtail SC/APC',                'Connectors & Patch Cords',  'Generic',   'pcs',  25,   45,   200, 40),
  ('RJ45-100',       'RJ45 Connector (pack of 100)',        'Connectors & Patch Cords',  'Generic',   'pack', 250,  400,  18, 5),
  ('SPL-1X8',        'PLC Splitter 1:8',                    'Splitters & Splicing',      'Generic',   'pcs',  350,  550,  35, 10),
  ('SPL-1X16',       'PLC Splitter 1:16',                   'Splitters & Splicing',      'Generic',   'pcs',  650,  950,  20, 6),
  ('SPS-100',        'Splice Protection Sleeve (pack of 100)','Splitters & Splicing',    'Generic',   'pack', 200,  320,  25, 5),
  ('CLV-BLADE',      'Fiber Cleaver Replacement Blade',     'Splitters & Splicing',      'Generic',   'pcs',  400,  650,  6,  3),
  ('FTB-8P',         'Fiber Termination Box (8 Port)',      'Accessories',               'Generic',   'pcs',  550,  850,  22, 5),
  ('FP-1P',          'Wall Mount Faceplate (Single Port)',  'Accessories',               'Generic',   'pcs',  60,   100,  90, 15),
  ('TIE-100',        'Cable Ties (pack of 100)',            'Accessories',               'Generic',   'pack', 80,   130,  40, 10),
  ('CAT6-1M',        'Cat6 UTP Cable',                      'Accessories',               'Generic',   'meter',18,   30,   1500, 300),
  ('PWR-12V1A',      '12V 1A Power Adapter (ONU)',          'Power & Backup',            'Generic',   'pcs',  180,  280,  50, 10)
) as v(sku, product_name, category_name, brand, unit, purchase_price, selling_price, current_stock, minimum_stock)
join cat on cat.category_name = v.category_name
on conflict (sku) do nothing;
