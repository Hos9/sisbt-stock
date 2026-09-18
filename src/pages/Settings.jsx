import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Settings() {
  const { profile, user } = useAuth()
  const [allowNegative, setAllowNegative] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState([])

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    const [{ data: settings }, { data: profiles }] = await Promise.all([
      supabase.from('app_settings').select('*').eq('id', 1).single(),
      supabase.from('profiles').select('id, full_name, role, created_at').order('created_at')
    ])
    setAllowNegative(!!settings?.allow_negative_stock)
    setUsers(profiles || [])
    setLoading(false)
  }

  const toggleNegative = async () => {
    setSaving(true)
    const next = !allowNegative
    const { error } = await supabase.from('app_settings').update({ allow_negative_stock: next }).eq('id', 1)
    if (!error) setAllowNegative(next)
    setSaving(false)
  }

  const updateRole = async (id, role) => {
    await supabase.from('profiles').update({ role }).eq('id', id)
    load()
  }

  return (
    <Layout title="Settings">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-card">
          <h2 className="mb-1 font-display text-base font-semibold text-ink-900">Stock Rules</h2>
          <p className="mb-4 text-sm text-ink-700/60">Controls what happens when a Stock Out entry would push a product below zero.</p>

          <div className="flex items-center justify-between rounded-lg border border-surface-border p-4">
            <div>
              <p className="text-sm font-medium text-ink-900">Allow negative stock</p>
              <p className="text-xs text-ink-700/50">When off, Stock Out is blocked once available quantity reaches zero.</p>
            </div>
            <button
              onClick={toggleNegative}
              disabled={loading || saving}
              className={`focus-ring relative h-6 w-11 shrink-0 rounded-full transition-colors ${allowNegative ? 'bg-signal' : 'bg-surface-border'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${allowNegative ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-card">
          <h2 className="mb-1 font-display text-base font-semibold text-ink-900">Your Account</h2>
          <p className="mb-4 text-sm text-ink-700/60">Signed in as an administrator.</p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink-700/60">Name</dt><dd className="font-medium text-ink-900">{profile?.full_name || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-700/60">Email</dt><dd className="font-medium text-ink-900">{user?.email}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-700/60">Role</dt><dd className="font-medium capitalize text-ink-900">{profile?.role}</dd></div>
          </dl>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-surface-border bg-white p-5 shadow-card">
          <h2 className="mb-1 font-display text-base font-semibold text-ink-900">Users &amp; Roles</h2>
          <p className="mb-4 text-sm text-ink-700/60">
            To add a new user, invite them from your Supabase project's Authentication dashboard. A matching row is
            created here automatically; set their role below.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-left text-xs uppercase text-ink-700/50">
                  <th className="py-2 font-medium">Name</th>
                  <th className="py-2 font-medium">Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-surface-border last:border-0">
                    <td className="py-2 text-ink-900">{u.full_name || u.id.slice(0, 8)}</td>
                    <td className="py-2">
                      <select
                        value={u.role}
                        onChange={(e) => updateRole(u.id, e.target.value)}
                        className="focus-ring rounded-lg border border-surface-border px-2 py-1 text-sm"
                      >
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}
