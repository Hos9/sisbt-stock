import React, { useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

const emptyForm = {
  id: null,
  sku: '',
  product_name: '',
  category_id: '',
  brand: '',
  unit: 'pcs',
  purchase_price: '',
  selling_price: '',
  minimum_stock: '0',
  opening_stock: '0'
}

export default function Products() {
  const { isAdmin } = useAuth()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('product_name')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    const [{ data: prods }, { data: cats }] = await Promise.all([
      supabase.from('products').select('*, categories(category_name)').order('product_name'),
      supabase.from('categories').select('*').order('category_name')
    ])
    setProducts(prods || [])
    setCategories(cats || [])
    setLoading(false)
  }

  const stockStatus = (p) => {
    if (Number(p.current_stock) <= 0) return 'Out of Stock'
    if (Number(p.current_stock) <= Number(p.minimum_stock)) return 'Low Stock'
    return 'In Stock'
  }

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      const q = search.trim().toLowerCase()
      const matchesSearch =
        !q ||
        p.product_name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q)
      const matchesCategory = !categoryFilter || p.category_id === categoryFilter
      const matchesStatus = !statusFilter || stockStatus(p) === statusFilter
      return matchesSearch && matchesCategory && matchesStatus
    })
    list.sort((a, b) => {
      if (sortBy === 'current_stock') return Number(b.current_stock) - Number(a.current_stock)
      return String(a[sortBy] || '').localeCompare(String(b[sortBy] || ''))
    })
    return list
  }, [products, search, categoryFilter, statusFilter, sortBy])

  const openAddModal = () => {
    setForm(emptyForm)
    setFormError('')
    setModalOpen(true)
  }

  const openEditModal = (p) => {
    setForm({
      id: p.id,
      sku: p.sku,
      product_name: p.product_name,
      category_id: p.category_id || '',
      brand: p.brand || '',
      unit: p.unit || 'pcs',
      purchase_price: p.purchase_price ?? '',
      selling_price: p.selling_price ?? '',
      minimum_stock: p.minimum_stock ?? '0',
      opening_stock: p.current_stock ?? '0'
    })
    setFormError('')
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!form.sku.trim() || !form.product_name.trim()) {
      setFormError('SKU and Product Name are required.')
      return
    }

    const duplicate = products.find(
      (p) => p.sku.toLowerCase() === form.sku.trim().toLowerCase() && p.id !== form.id
    )
    if (duplicate) {
      setFormError('A product with this SKU already exists.')
      return
    }

    setSaving(true)
    const payload = {
      sku: form.sku.trim(),
      product_name: form.product_name.trim(),
      category_id: form.category_id || null,
      brand: form.brand.trim(),
      unit: form.unit,
      purchase_price: Number(form.purchase_price) || 0,
      selling_price: Number(form.selling_price) || 0,
      minimum_stock: Number(form.minimum_stock) || 0
    }

    let error
    if (form.id) {
      ;({ error } = await supabase.from('products').update(payload).eq('id', form.id))
    } else {
      ;({ error } = await supabase
        .from('products')
        .insert({ ...payload, current_stock: Number(form.opening_stock) || 0 }))
    }

    setSaving(false)
    if (error) {
      setFormError(error.message || 'Could not save product.')
      return
    }
    setModalOpen(false)
    loadAll()
  }

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete "${p.product_name}"? This cannot be undone.`)) return
    const { error } = await supabase.from('products').delete().eq('id', p.id)
    if (error) {
      alert(error.message || 'Could not delete product. It may have existing stock movements.')
      return
    }
    loadAll()
  }

  return (
    <Layout title="Products">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <input
            placeholder="Search by name, SKU, or brand…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="focus-ring w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm sm:max-w-xs"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="focus-ring rounded-lg border border-surface-border bg-white px-3 py-2 text-sm"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.category_name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="focus-ring rounded-lg border border-surface-border bg-white px-3 py-2 text-sm"
          >
            <option value="">All Statuses</option>
            <option>In Stock</option>
            <option>Low Stock</option>
            <option>Out of Stock</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="focus-ring rounded-lg border border-surface-border bg-white px-3 py-2 text-sm"
          >
            <option value="product_name">Sort: Name</option>
            <option value="sku">Sort: SKU</option>
            <option value="current_stock">Sort: Stock</option>
          </select>
        </div>
        {isAdmin && (
          <button
            onClick={openAddModal}
            className="focus-ring shrink-0 rounded-lg bg-signal px-4 py-2 text-sm font-semibold text-white hover:bg-signal-dark"
          >
            + Add Product
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-surface-border bg-white shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border text-left text-xs uppercase text-ink-700/50">
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Unit</th>
              <th className="px-4 py-3 text-right font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {isAdmin && <th className="px-4 py-3 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-ink-700/50">Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-ink-700/50">No products found.</td></tr>
            )}
            {filtered.map((p) => {
              const status = stockStatus(p)
              return (
                <tr key={p.id} className="border-b border-surface-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-ink-700/70">{p.sku}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-900">{p.product_name}</p>
                    <p className="text-xs text-ink-700/50">{p.brand}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-700/70">{p.categories?.category_name || '—'}</td>
                  <td className="px-4 py-3 text-ink-700/70">{p.unit}</td>
                  <td className="px-4 py-3 text-right font-medium">{p.current_stock}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        status === 'In Stock'
                          ? 'bg-signal-light text-signal-dark'
                          : status === 'Low Stock'
                          ? 'bg-amber-light text-amber'
                          : 'bg-danger-light text-danger'
                      }`}
                    >
                      {status}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button onClick={() => openEditModal(p)} className="focus-ring text-xs font-semibold text-signal hover:underline">Edit</button>
                        <button onClick={() => handleDelete(p)} className="focus-ring text-xs font-semibold text-danger hover:underline">Delete</button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <form
            onSubmit={handleSave}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-card"
          >
            <h2 className="mb-4 font-display text-lg font-semibold text-ink-900">
              {form.id ? 'Edit Product' : 'Add Product'}
            </h2>

            {formError && (
              <div className="mb-4 rounded-lg bg-danger-light px-3 py-2 text-sm text-danger">{formError}</div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Product Code / SKU" required>
                <input className="input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </Field>
              <Field label="Product Name" required>
                <input className="input" value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} />
              </Field>
              <Field label="Category">
                <select className="input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                  <option value="">Uncategorized</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.category_name}</option>)}
                </select>
              </Field>
              <Field label="Brand">
                <input className="input" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </Field>
              <Field label="Unit">
                <input className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="pcs, box, roll, meter" />
              </Field>
              <Field label="Minimum Stock">
                <input type="number" className="input" value={form.minimum_stock} onChange={(e) => setForm({ ...form, minimum_stock: e.target.value })} />
              </Field>
              <Field label="Purchase Price">
                <input type="number" step="0.01" className="input" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} />
              </Field>
              <Field label="Selling Price">
                <input type="number" step="0.01" className="input" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} />
              </Field>
              {!form.id && (
                <Field label="Opening Stock">
                  <input type="number" className="input" value={form.opening_stock} onChange={(e) => setForm({ ...form, opening_stock: e.target.value })} />
                </Field>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setModalOpen(false)} className="focus-ring rounded-lg px-4 py-2 text-sm font-medium text-ink-700 hover:bg-surface-muted">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="focus-ring rounded-lg bg-signal px-4 py-2 text-sm font-semibold text-white hover:bg-signal-dark disabled:opacity-60">
                {saving ? 'Saving…' : 'Save Product'}
              </button>
            </div>
          </form>
        </div>
      )}

    </Layout>
  )
}

function Field({ label, required, children }) {
  return (
    <label className="col-span-2 block text-sm sm:col-span-1">
      <span className="mb-1 block font-medium text-ink-900">
        {label}{required && <span className="text-danger"> *</span>}
      </span>
      {children}
    </label>
  )
}
