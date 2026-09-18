# NetStock — ISP Stock & Inventory Management

A private, login-gated stock management web app for an ISP / network equipment
store (ONUs, fiber cable, patch cords, splitters, etc.), built with **React +
Vite + Tailwind** on the frontend and **Supabase** (Postgres + Auth + Row
Level Security) as the backend. No mock data — everything reads from and
writes to your Supabase project.

Branding: *Developed by Hos9 for Arham General Store* (footer, every
authenticated page).

---

## 1. What you get

- Email/password login via Supabase Auth. No page under `/dashboard`,
  `/products`, `/current-stock`, etc. renders without a valid session —
  unauthenticated visits redirect straight to `/login`.
- Dashboard with live totals: products, stock units, low/out-of-stock counts,
  today's stock in/out, recent movements.
- Products: add / edit / delete, search, filter by category & status, sort,
  duplicate-SKU validation.
- Stock In (purchase entry) and Stock Out (sales entry) forms that update
  `current_stock` and write a full audit trail to `stock_movements`.
- Stock Out is blocked once quantity hits zero, unless an admin turns on
  "Allow negative stock" in Settings.
- Current Stock view with status badges (In Stock / Low Stock / Out of
  Stock) and CSV export.
- Stock Movement history with product/type/date filters, search, pagination,
  and CSV export.
- Categories management.
- Reports page: Current Stock, Low Stock, Out-of-Stock, Stock In, Stock Out,
  and full Stock Movement — each exportable to CSV.
- Settings (admin-only): negative-stock toggle, staff/admin role management.
- Two roles — **admin** (full access) and **staff** (view products, enter
  stock in/out, view stock & history) — enforced both in the UI and in the
  database via Row Level Security, not just by hiding buttons.

## 2. Security model (how "logged-out users see nothing" is enforced)

- **Routing**: every page is wrapped in `<ProtectedRoute>`, which checks the
  live Supabase Auth session and redirects to `/login` if there isn't one —
  so typing a URL directly doesn't bypass anything.
- **Database**: Row Level Security is enabled on every table. Even if
  someone called the Supabase REST API directly with a stolen anon key but
  no valid session, every query returns zero rows, because every policy
  requires `auth.uid() is not null` at minimum, and write policies require
  an `admin` role.
- **Stock changes** (`Stock In` / `Stock Out`) are performed only through two
  Postgres functions (`fn_stock_in`, `fn_stock_out`) that re-check
  `auth.uid()` themselves, enforce the no-negative-stock rule server-side,
  and are the *only* way rows land in `stock_movements` — direct table
  writes to `stock_movements` are revoked entirely.
- The **service_role key is never used in the frontend** — only the public
  anon key, which is safe to ship because RLS does the real enforcement.

## 3. Prerequisites

- Node.js 18+
- A free [Supabase](https://supabase.com) account/project

## 4. Set up Supabase

1. Create a new Supabase project.
2. Open **SQL Editor → New query**, paste the entire contents of
   [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates all
   tables, indexes, RLS policies, and the stock-movement functions.
3. *(Optional)* Run [`supabase/seed.sql`](supabase/seed.sql) the same way to
   load sample ISP inventory (ONUs, fiber cable, patch cords, splitters,
   media converters, etc.) so you have something to click around with.
4. Go to **Authentication → Users → Add user** and create your first login
   (email + password). Disable "auto confirm" only if you also want to wire
   up email confirmation; for an internal tool, creating the user directly
   as already-confirmed is simplest.
5. Back in **SQL Editor**, promote that user to admin:
   ```sql
   update public.profiles set role = 'admin'
     where id = (select id from auth.users where email = 'you@example.com');
   ```
   Every user who signs up gets a `staff` profile automatically (via a
   trigger) — you only need to run this once, for your first account. Add
   more staff logins the same way from **Authentication → Users**, and
   promote any of them to `admin` from the app's own Settings page later.
6. Get your API keys from **Project Settings → API**:
   - `Project URL`
   - `anon` / `public` key (**not** `service_role`)

## 5. Run the app locally

```bash
cd stock-app
cp .env.example .env
# edit .env and paste in your Project URL + anon key
npm install
npm run dev
```

Open the printed local URL, sign in with the account you created above, and
you're in.

## 6. Build & deploy

```bash
npm run build
```

This outputs a static `dist/` folder you can deploy to any static host —
Vercel, Netlify, Cloudflare Pages, GitHub Pages, etc. — all of which have
free tiers. When deploying, set the same two environment variables
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in your host's dashboard
rather than committing `.env`.

## 7. Project structure

```
stock-app/
├── src/
│   ├── components/       Layout (sidebar/topbar/footer), ProtectedRoute
│   ├── context/           AuthContext (Supabase session + profile/role)
│   ├── lib/                supabaseClient, csv export helper
│   └── pages/              Login, Dashboard, Products, StockIn, StockOut,
│                            CurrentStock, StockMovement, Categories,
│                            Reports, Settings
├── supabase/
│   ├── schema.sql          Tables, RLS policies, stock functions
│   └── seed.sql             Optional sample ISP inventory
├── .env.example
└── README.md (this file)
```

## 8. Extending roles/users later

The `profiles.role` column already supports `admin` and `staff`; adding a
third tier just means widening the `check` constraint in `schema.sql` and
the `is_admin()`-style checks that gate writes. Inviting new team members is
done from Supabase's own Authentication dashboard — no custom invite flow
was built, since that would require the `service_role` key, which per the
security requirements never belongs in frontend code.
