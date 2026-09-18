import React, { useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'
import { exportToCsv } from '../lib/csv'

export default function CurrentStock() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('products').select('*, categories(category_name)').order('product_name'),
      supabase.from('categories').select('*').order('category_name')
    ]).then(([{ data: prods }, { data: cats }]) => {
      setProducts(prods || [])
      setCategories(cats || [])
      setLoading(false)
    })
  }, [])

  const stockStatus = (p) => {
    if (Number(p.current_stock) <= 0) return 'Out of Stock'
    if (Number(p.current_stock) <= Number(p.minimum_stock)) return 'Low Stock'
    return 'In Stock'
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      const matchesSearch =
        !q ||
        p.product_name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q) ||
        (p.categories?.category_name || '').toLowerCase().includes(q)
      const matchesCategory = !categoryFilter || p.category_id === categoryFilter
      const matchesStatus = !statusFilter || stockStatus(p) === statusFilter
      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [products, search, categoryFilter, statusFilter])

  const handleExport = () => {
    exportToCsv(
      'current-stock.csv',
      filtered.map((p) => ({
        SKU: p.sku,
        Product: p.product_name,
        Category: p.categories?.category_name || '',
        Unit: p.unit,
        'Current Stock': p.current_stock,
        'Minimum Stock': p.minimum_stock,
        Status: stockStatus(p)
      }))
    )
  }

  return (
    <Layout title="Current Stock">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <input
            placeholder="Search SKU, name, brand, category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input sm:max-w-xs"
          />
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="input sm:w-48">
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.category_name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input sm:w-40">
            <option value="">All Statuses</option>
            <option>In Stock</option>
            <option>Low Stock</option>
            <option>Out of Stock</option>
          </select>
        </div>
        <button onClick={handleExport} className="focus-ring shrink-0 rounded-lg border border-surface-border bg-white px-4 py-2 text-sm font-semibold text-ink-900 hover:bg-surface-muted">
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-surface-border bg-white shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border text-left text-xs uppercase text-ink-700/50">
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Unit</th>
              <th className="px-4 py-3 text-right font-medium">Current Stock</th>
              <th className="px-4 py-3 text-right font-medium">Minimum Stock</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-4 py-6 text-center text-ink-700/50">Loading…</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-ink-700/50">No products found.</td></tr>}
            {filtered.map((p) => {
              const status = stockStatus(p)
              return (
                <tr key={p.id} className="border-b border-surface-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-ink-700/70">{p.sku}</td>
                  <td className="px-4 py-3 font-medium text-ink-900">{p.product_name}</td>
                  <td className="px-4 py-3 text-ink-700/70">{p.categories?.category_name || '—'}</td>
                  <td className="px-4 py-3 text-ink-700/70">{p.unit}</td>
                  <td className="px-4 py-3 text-right font-medium">{p.current_stock}</td>
                  <td className="px-4 py-3 text-right text-ink-700/70">{p.minimum_stock}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status === 'In Stock' ? 'bg-signal-light text-signal-dark' : status === 'Low Stock' ? 'bg-amber-light text-amber' : 'bg-danger-light text-danger'}`}>
                      {status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
