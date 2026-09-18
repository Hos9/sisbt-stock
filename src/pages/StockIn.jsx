import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'

const emptyForm = {
  date: new Date().toISOString().slice(0, 10),
  reference_number: '',
  product_id: '',
  quantity: '',
  purchase_price: '',
  supplier: '',
  notes: ''
}

export default function StockIn() {
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [message, setMessage] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase
      .from('products')
      .select('id, sku, product_name, current_stock')
      .order('product_name')
      .then(({ data }) => setProducts(data || []))
  }, [])

  const selectedProduct = products.find((p) => p.id === form.product_id)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)

    if (!form.product_id || !form.quantity || Number(form.quantity) <= 0) {
      setMessage({ type: 'error', text: 'Please select a product and enter a valid quantity.' })
      return
    }

    setSaving(true)
    const { data, error } = await supabase.rpc('fn_stock_in', {
      p_product_id: form.product_id,
      p_quantity: Number(form.quantity),
      p_reference_number: form.reference_number || null,
      p_notes: form.notes || null,
      p_supplier: form.supplier || null,
      p_unit_price: form.purchase_price ? Number(form.purchase_price) : null
    })
    setSaving(false)

    if (error) {
      setMessage({ type: 'error', text: error.message || 'Could not record stock in.' })
      return
    }

    setMessage({ type: 'success', text: `Stock added. New balance: ${data?.[0]?.new_stock ?? '—'}.` })
    setForm({ ...emptyForm, date: form.date })
    supabase.from('products').select('id, sku, product_name, current_stock').order('product_name').then(({ data }) => setProducts(data || []))
  }

  return (
    <Layout title="Stock In / Purchase Entry">
      <div className="mx-auto max-w-xl">
        {message && (
          <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${message.type === 'success' ? 'bg-signal-light text-signal-dark' : 'bg-danger-light text-danger'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="rounded-2xl border border-surface-border bg-white p-6 shadow-card">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink-900">Date</span>
              <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink-900">Reference / Invoice No.</span>
              <input className="input" value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} placeholder="PO-1042" />
            </label>

            <label className="col-span-2 block text-sm">
              <span className="mb-1 block font-medium text-ink-900">Product *</span>
              <select className="input" value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
                <option value="">Select a product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.sku} — {p.product_name}</option>
                ))}
              </select>
              {selectedProduct && (
                <span className="mt-1 block text-xs text-ink-700/50">Current stock: {selectedProduct.current_stock}</span>
              )}
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink-900">Quantity *</span>
              <input type="number" min="1" className="input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink-900">Purchase Price</span>
              <input type="number" step="0.01" className="input" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} />
            </label>

            <label className="col-span-2 block text-sm">
              <span className="mb-1 block font-medium text-ink-900">Supplier</span>
              <input className="input" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
            </label>

            <label className="col-span-2 block text-sm">
              <span className="mb-1 block font-medium text-ink-900">Notes</span>
              <textarea rows={3} className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>
          </div>

          <button type="submit" disabled={saving} className="focus-ring mt-5 w-full rounded-lg bg-signal py-2.5 text-sm font-semibold text-white hover:bg-signal-dark disabled:opacity-60">
            {saving ? 'Saving…' : 'Record Stock In'}
          </button>
        </form>
      </div>
    </Layout>
  )
}
