import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Categories() {
  const { isAdmin } = useAuth()
  const [categories, setCategories] = useState([])
  const [counts, setCounts] = useState({})
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    const { data: cats } = await supabase.from('categories').select('*').order('category_name')
    const { data: prods } = await supabase.from('products').select('category_id')
    const tally = {}
    ;(prods || []).forEach((p) => {
      if (p.category_id) tally[p.category_id] = (tally[p.category_id] || 0) + 1
    })
    setCategories(cats || [])
    setCounts(tally)
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    setError('')
    if (!newName.trim()) return
    const { error } = await supabase.from('categories').insert({ category_name: newName.trim() })
    if (error) {
      setError(error.message || 'Could not add category.')
      return
    }
    setNewName('')
    load()
  }

  const startEdit = (c) => {
    setEditingId(c.id)
    setEditingName(c.category_name)
  }

  const saveEdit = async (id) => {
    const { error } = await supabase.from('categories').update({ category_name: editingName.trim() }).eq('id', id)
    if (!error) {
      setEditingId(null)
      load()
    }
  }

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete category "${c.category_name}"?`)) return
    const { error } = await supabase.from('categories').delete().eq('id', c.id)
    if (error) {
      alert(error.message || 'Could not delete — it may still have products assigned.')
      return
    }
    load()
  }

  return (
    <Layout title="Categories">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 overflow-x-auto rounded-2xl border border-surface-border bg-white shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-left text-xs uppercase text-ink-700/50">
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Products</th>
                {isAdmin && <th className="px-4 py-3 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-ink-700/50">No categories yet.</td></tr>}
              {categories.map((c) => (
                <tr key={c.id} className="border-b border-surface-border last:border-0">
                  <td className="px-4 py-3">
                    {editingId === c.id ? (
                      <input className="input" value={editingName} onChange={(e) => setEditingName(e.target.value)} />
                    ) : (
                      <span className="font-medium text-ink-900">{c.category_name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-700/70">{counts[c.id] || 0}</td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      {editingId === c.id ? (
                        <div className="flex gap-3">
                          <button onClick={() => saveEdit(c.id)} className="focus-ring text-xs font-semibold text-signal hover:underline">Save</button>
                          <button onClick={() => setEditingId(null)} className="focus-ring text-xs font-semibold text-ink-700/60 hover:underline">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          <button onClick={() => startEdit(c)} className="focus-ring text-xs font-semibold text-signal hover:underline">Edit</button>
                          <button onClick={() => handleDelete(c)} className="focus-ring text-xs font-semibold text-danger hover:underline">Delete</button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isAdmin && (
          <div className="h-fit rounded-2xl border border-surface-border bg-white p-5 shadow-card">
            <h2 className="mb-3 font-display text-base font-semibold text-ink-900">Add Category</h2>
            {error && <div className="mb-3 rounded-lg bg-danger-light px-3 py-2 text-sm text-danger">{error}</div>}
            <form onSubmit={handleAdd} className="flex gap-2">
              <input className="input" placeholder="e.g. ONU / ONT" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <button type="submit" className="focus-ring shrink-0 rounded-lg bg-signal px-4 py-2 text-sm font-semibold text-white hover:bg-signal-dark">Add</button>
            </form>
          </div>
        )}
      </div>
    </Layout>
  )
}
