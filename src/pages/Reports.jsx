import React, { useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'
import { exportToCsv } from '../lib/csv'

const REPORTS = [
  { id: 'current_stock', label: 'Current Stock Report', desc: 'Full stock list with balances and status.' },
  { id: 'low_stock', label: 'Low Stock Report', desc: 'Products at or below minimum stock.' },
  { id: 'out_of_stock', label: 'Out-of-Stock Report', desc: 'Products with zero stock.' },
  { id: 'stock_in', label: 'Stock In Report', desc: 'All purchase / stock-in movements.' },
  { id: 'stock_out', label: 'Stock Out Report', desc: 'All sales / stock-out movements.' },
  { id: 'stock_movement', label: 'Stock Movement Report', desc: 'Complete movement history (IN, OUT, ADJUSTMENT).' }
]

const stockStatus = (p) => {
  if (Number(p.current_stock) <= 0) return 'Out of Stock'
  if (Number(p.current_stock) <= Number(p.minimum_stock)) return 'Low Stock'
  return 'In Stock'
}

export default function Reports() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [running, setRunning] = useState(null)

  const runReport = async (id) => {
    setRunning(id)
    try {
      if (['current_stock', 'low_stock', 'out_of_stock'].includes(id)) {
        const { data } = await supabase.from('products').select('*, categories(category_name)').order('product_name')
        let rows = (data || []).map((p) => ({
          SKU: p.sku,
          Product: p.product_name,
          Category: p.categories?.category_name || '',
          'Current Stock': p.current_stock,
          'Minimum Stock': p.minimum_stock,
          Status: stockStatus(p)
        }))
        if (id === 'low_stock') rows = rows.filter((r) => r.Status === 'Low Stock')
        if (id === 'out_of_stock') rows = rows.filter((r) => r.Status === 'Out of Stock')
        exportToCsv(`${id}.csv`, rows)
        return
      }

      let query = supabase
        .from('stock_movements')
        .select('*, products(product_name, sku)')
        .order('created_at', { ascending: false })
      if (id === 'stock_in') query = query.eq('movement_type', 'IN')
      if (id === 'stock_out') query = query.eq('movement_type', 'OUT')
      if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`)
      if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59`)

      const { data } = await query
      exportToCsv(
        `${id}.csv`,
        (data || []).map((m) => ({
          Date: new Date(m.created_at).toLocaleString(),
          Product: m.products?.product_name,
          SKU: m.products?.sku,
          Type: m.movement_type,
          Quantity: m.quantity,
          'Previous Stock': m.previous_stock,
          'New Stock': m.new_stock,
          Reference: m.reference_number,
          Notes: m.notes
        }))
      )
    } finally {
      setRunning(null)
    }
  }

  return (
    <Layout title="Reports">
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-surface-border bg-white p-4 shadow-card">
        <span className="text-sm font-medium text-ink-900">Date range for movement reports:</span>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input w-40" />
        <span className="text-sm text-ink-700/50">to</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input w-40" />
        <span className="text-xs text-ink-700/50">(leave blank to include all dates)</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <div key={r.id} className="flex flex-col justify-between rounded-2xl border border-surface-border bg-white p-5 shadow-card">
            <div>
              <h3 className="font-display text-base font-semibold text-ink-900">{r.label}</h3>
              <p className="mt-1 text-sm text-ink-700/60">{r.desc}</p>
            </div>
            <button
              onClick={() => runReport(r.id)}
              disabled={running === r.id}
              className="focus-ring mt-4 rounded-lg bg-signal py-2 text-sm font-semibold text-white hover:bg-signal-dark disabled:opacity-60"
            >
              {running === r.id ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>
        ))}
      </div>
    </Layout>
  )
}
