import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'

const emptyForm = {
  date: new Date().toISOString().slice(0, 10),
  reference_number: '',
  product_id: '',
  quantity: '',
  selling_price: '',
  customer: '',
  notes: ''
}

export default function StockOut() {
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [message, setMessage] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    refreshProducts()
  }, [])

  const refreshProducts = () => {
    supabase
      .from('products')
      .select('id, sku, product_name, current_stock')
      .order('product_name')
      .then(({ data }) => setProducts(data || []))
  }

  const selectedProduct = products.find((p) => p.id === form.product_id)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)

    if (!form.product_id || !form.quantity || Number(form.quantity) <= 0) {
      setMessage({ type: 'error', text: 'Please select a product and enter a valid quantity.' })
      return
    }

    if (selectedProduct && Number(form.quantity) > Number(selectedProduct.current_stock)) {
      // Client-side heads-up only — the database still enforces this via fn_stock_out.
      setMessage({ type: 'error', text: `Only ${selectedProduct.current_stock} units available in stock.` })
      return
    }

    setSaving(true)
    const { data, error } = await supabase.rpc('fn_stock_out', {
      p_product_id: form.product_id,
      p_quantity: Number(form.quantity),
      p_reference_number: form.reference_number || null,
      p_notes: form.notes || null,
      p_customer: form.customer || null,
      p_unit_price: form.selling_price ? Number(form.selling_price) : null
    })
    setSaving(false)

    if (error) {
      setMessage({
        type: 'error',
        text: error.message?.includes('Insufficient') ? error.message : error.message || 'Could not record stock out.'
      })
      return
    }

    setMessage({ type: 'success', text: `Sale recorded. New balance: ${data?.[0]?.new_stock ?? '—'}.` })
    setForm({ ...emptyForm, date: form.date })
    refreshProducts()
  }

  return (
    <Layout title="Stock Out / Sales Entry">
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
              <input className="input" value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} placeholder="INV-2041" />
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
                <span className="mt-1 block text-xs text-ink-700/50">Available stock: {selectedProduct.current_stock}</span>
              )}
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink-900">Quantity *</span>
              <input type="number" min="1" className="input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink-900">Selling Price</span>
              <input type="number" step="0.01" className="input" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} />
            </label>

            <label className="col-span-2 block text-sm">
              <span className="mb-1 block font-medium text-ink-900">Customer (optional)</span>
              <input className="input" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} />
            </label>

            <label className="col-span-2 block text-sm">
              <span className="mb-1 block font-medium text-ink-900">Notes</span>
              <textarea rows={3} className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>
          </div>

          <button type="submit" disabled={saving} className="focus-ring mt-5 w-full rounded-lg bg-signal py-2.5 text-sm font-semibold text-white hover:bg-signal-dark disabled:opacity-60">
            {saving ? 'Saving…' : 'Record Stock Out'}
          </button>
        </form>
      </div>
    </Layout>
  )
}
