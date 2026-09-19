import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'
import { exportToCsv } from '../lib/csv'
import { useAuth } from '../context/AuthContext'

const PAGE_SIZE = 15

export default function StockMovement() {
  const { isAdmin } = useAuth()
  const [movements, setMovements] = useState([])
  const [products, setProducts] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [productFilter, setProductFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    supabase.from('products').select('id, sku, product_name').order('product_name').then(({ data }) => setProducts(data || []))
  }, [])

  useEffect(() => {
    loadMovements()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, productFilter, typeFilter, dateFrom, dateTo, isAdmin])

  const loadMovements = async () => {
    setLoading(true)
    let query = supabase
      .from('stock_movements')
      .select(
        isAdmin
          ? '*, products(product_name, sku), profiles(full_name)'
          : '*, products(product_name, sku)',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

    if (productFilter) query = query.eq('product_id', productFilter)
    if (typeFilter) query = query.eq('movement_type', typeFilter)
    if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`)
    if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59`)

    const { data, count } = await query
    setMovements(data || [])
    setTotalCount(count || 0)
    setLoading(false)
  }

  const filteredForSearch = movements.filter((m) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      m.products?.product_name?.toLowerCase().includes(q) ||
      m.products?.sku?.toLowerCase().includes(q) ||
      (m.reference_number || '').toLowerCase().includes(q)
    )
  })

  const handleExport = async () => {
    let query = supabase
      .from('stock_movements')
      .select(isAdmin ? '*, products(product_name, sku), profiles(full_name)' : '*, products(product_name, sku)')
      .order('created_at', { ascending: false })
    if (productFilter) query = query.eq('product_id', productFilter)
    if (typeFilter) query = query.eq('movement_type', typeFilter)
    if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`)
    if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59`)
    const { data } = await query
    exportToCsv(
      'stock-movements.csv',
      (data || []).map((m) => ({
        Date: new Date(m.created_at).toLocaleString(),
        Product: m.products?.product_name,
        SKU: m.products?.sku,
        Type: m.movement_type,
        Quantity: m.quantity,
        'Previous Stock': m.previous_stock,
        'New Stock': m.new_stock,
        Reference: m.reference_number,
        Notes: m.notes,
        ...(isAdmin ? { 'Posted By': m.profiles?.full_name || '—' } : {})
      }))
    )
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <Layout title="Stock Movement">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input placeholder="Search product or reference…" value={search} onChange={(e) => setSearch(e.target.value)} className="input max-w-xs" />
        <select value={productFilter} onChange={(e) => { setProductFilter(e.target.value); setPage(0) }} className="input w-48">
          <option value="">All Products</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.product_name}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(0) }} className="input w-40">
          <option value="">All Types</option>
          <option value="IN">IN</option>
          <option value="OUT">OUT</option>
          <option value="ADJUSTMENT">ADJUSTMENT</option>
        </select>
        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0) }} className="input w-40" />
        <span className="text-ink-700/50 text-sm">to</span>
        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0) }} className="input w-40" />
        <button onClick={handleExport} className="focus-ring ml-auto rounded-lg border border-surface-border bg-white px-4 py-2 text-sm font-semibold text-ink-900 hover:bg-surface-muted">
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-surface-border bg-white shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border text-left text-xs uppercase text-ink-700/50">
              <th className="px-4 py-3 font-medium">Date &amp; Time</th>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 text-right font-medium">Qty</th>
              <th className="px-4 py-3 text-right font-medium">Prev → New</th>
              <th className="px-4 py-3 font-medium">Reference</th>
              {isAdmin && <th className="px-4 py-3 font-medium">Posted By</th>}
              <th className="px-4 py-3 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={isAdmin ? 8 : 7} className="px-4 py-6 text-center text-ink-700/50">Loading…</td></tr>}
            {!loading && filteredForSearch.length === 0 && <tr><td colSpan={isAdmin ? 8 : 7} className="px-4 py-6 text-center text-ink-700/50">No movements found.</td></tr>}
            {filteredForSearch.map((m) => (
              <tr key={m.id} className="border-b border-surface-border last:border-0">
                <td className="px-4 py-3 text-ink-700/70">{new Date(m.created_at).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-ink-900">{m.products?.product_name}</p>
                  <p className="text-xs text-ink-700/50">{m.products?.sku}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${m.movement_type === 'IN' ? 'bg-signal-light text-signal-dark' : m.movement_type === 'OUT' ? 'bg-danger-light text-danger' : 'bg-amber-light text-amber'}`}>
                    {m.movement_type}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-medium">{m.quantity}</td>
                <td className="px-4 py-3 text-right text-ink-700/70">{m.previous_stock} → {m.new_stock}</td>
                <td className="px-4 py-3 text-ink-700/70">{m.reference_number || '—'}</td>
                {isAdmin && <td className="px-4 py-3 text-ink-700/70">{m.profiles?.full_name || '—'}</td>}
                <td className="px-4 py-3 text-ink-700/70">{m.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-ink-700/70">
        <span>Page {page + 1} of {totalPages} · {totalCount} records</span>
        <div className="flex gap-2">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="focus-ring rounded-lg border border-surface-border bg-white px-3 py-1.5 disabled:opacity-40">Previous</button>
          <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} className="focus-ring rounded-lg border border-surface-border bg-white px-3 py-1.5 disabled:opacity-40">Next</button>
        </div>
      </div>
    </Layout>
  )
}
