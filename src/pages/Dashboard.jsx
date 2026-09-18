import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'

function StatCard({ label, value, tone = 'default' }) {
  const tones = {
    default: 'bg-white text-ink-900',
    signal: 'bg-signal-light text-signal-dark',
    amber: 'bg-amber-light text-amber',
    danger: 'bg-danger-light text-danger'
  }
  return (
    <div className={`rounded-2xl border border-surface-border p-4 shadow-card ${tones[tone]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalStockUnits: 0,
    lowStock: 0,
    outOfStock: 0,
    todayIn: 0,
    todayOut: 0
  })
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    setLoading(true)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [{ data: products }, { data: movements }] = await Promise.all([
      supabase.from('products').select('id, current_stock, minimum_stock'),
      supabase
        .from('stock_movements')
        .select('id, movement_type, quantity, created_at, notes, reference_number, products(product_name, sku)')
        .order('created_at', { ascending: false })
        .limit(8)
    ])

    const list = products || []
    const totalProducts = list.length
    const totalStockUnits = list.reduce((sum, p) => sum + Number(p.current_stock || 0), 0)
    const lowStock = list.filter((p) => p.current_stock > 0 && p.current_stock <= p.minimum_stock).length
    const outOfStock = list.filter((p) => Number(p.current_stock) <= 0).length

    const { data: todayMovements } = await supabase
      .from('stock_movements')
      .select('movement_type, quantity, created_at')
      .gte('created_at', todayStart.toISOString())

    const todayIn = (todayMovements || [])
      .filter((m) => m.movement_type === 'IN')
      .reduce((s, m) => s + Number(m.quantity), 0)
    const todayOut = (todayMovements || [])
      .filter((m) => m.movement_type === 'OUT')
      .reduce((s, m) => s + Number(m.quantity), 0)

    setStats({ totalProducts, totalStockUnits, lowStock, outOfStock, todayIn, todayOut })
    setRecent(movements || [])
    setLoading(false)
  }

  return (
    <Layout title="Dashboard">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total Products" value={stats.totalProducts} />
        <StatCard label="Total Stock Units" value={stats.totalStockUnits} tone="signal" />
        <StatCard label="Low Stock" value={stats.lowStock} tone="amber" />
        <StatCard label="Out of Stock" value={stats.outOfStock} tone="danger" />
        <StatCard label="Today's Stock IN" value={stats.todayIn} />
        <StatCard label="Today's Stock OUT" value={stats.todayOut} />
      </div>

      <div className="mt-6 rounded-2xl border border-surface-border bg-white shadow-card">
        <div className="border-b border-surface-border px-5 py-4">
          <h2 className="font-display text-base font-semibold text-ink-900">Recent Stock Movements</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-left text-xs uppercase text-ink-700/50">
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Qty</th>
                <th className="px-5 py-3 font-medium">Reference</th>
                <th className="px-5 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="px-5 py-6 text-center text-ink-700/50">Loading…</td></tr>
              )}
              {!loading && recent.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-6 text-center text-ink-700/50">No stock movements yet.</td></tr>
              )}
              {recent.map((m) => (
                <tr key={m.id} className="border-b border-surface-border last:border-0">
                  <td className="px-5 py-3">
                    <p className="font-medium text-ink-900">{m.products?.product_name}</p>
                    <p className="text-xs text-ink-700/50">{m.products?.sku}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        m.movement_type === 'IN'
                          ? 'bg-signal-light text-signal-dark'
                          : m.movement_type === 'OUT'
                          ? 'bg-danger-light text-danger'
                          : 'bg-amber-light text-amber'
                      }`}
                    >
                      {m.movement_type}
                    </span>
                  </td>
                  <td className="px-5 py-3">{m.quantity}</td>
                  <td className="px-5 py-3 text-ink-700/70">{m.reference_number || '—'}</td>
                  <td className="px-5 py-3 text-ink-700/70">{new Date(m.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
