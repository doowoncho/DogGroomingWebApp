'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import type { User } from '@supabase/supabase-js'
type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'declined'

const TABS = ['all', 'pending', 'confirmed', 'completed', 'cancelled', 'declined'] as const
type Tab = typeof TABS[number]

const STATUS_STYLES: Record<string, string> = {
  pending:    'bg-amber-50 text-amber-800',
  confirmed:  'bg-blue-50 text-blue-800',
  inprogress: 'bg-purple-50 text-purple-800',
  completed:  'bg-green-50 text-green-800',
  cancelled:  'bg-gray-100 text-gray-600',
  declined:   'bg-red-50 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  pending:    'Pending',
  confirmed:  'Confirmed',
  inprogress: 'In progress',
  completed:  'Completed',
  cancelled:  'Cancelled',
  declined:   'Declined',
}

type Booking = {
  id: number
  service_id: number
  date: string
  time: string
  dog_name: string
  phone: string
  email: string
  breed: string
  status: BookingStatus
}

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<{ is_admin: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [appointments, setAppointments] = useState<Booking[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Booking | null>(null)

  useEffect(() => {
    const checkAdmin = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const res = await fetch('/api/profile')

    if (!res.ok) {
      throw new Error('Failed to fetch profile')
    }

    const prof = await res.json()
    if (prof?.is_admin !== true) {
      router.push('/account')
      return
    }

    setProfile(prof)
    setUser(user)
    setLoading(false)
  }

  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/admin/bookings')
      if (!res.ok) throw new Error('Failed to fetch bookings')
        const data = await res.json()
      setAppointments(data.bookings)
    } catch (err) {
      console.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }
  
    checkAdmin()
    fetchBookings()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  function updateStatus(id: number, status: Booking['status']) {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a))
    setSelected(prev => prev?.id === id ? { ...prev, status } : prev)
    // TODO: await supabase.from('appointments').update({ status }).eq('id', id)
  }

  const filtered = appointments
    .filter(a => activeTab === 'all' || a.status === activeTab)
    .filter(a => {
      const q = search.toLowerCase()
      return !q || a.dog_name.toLowerCase().includes(q) || a.breed.toLowerCase().includes(q)
    })

  function countFor(tab: Tab) {
    return tab === 'all' ? appointments.length : appointments.filter(a => a.status === tab).length
  }

  function formatDate(d: string) {
    const [y, m, day] = d.split('-').map(Number)
    return new Date(y, m - 1, day).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function initials(name: string) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

  if (loading) return <div className="p-8 text-sm text-text-muted">Loading...</div>
  if (!profile?.is_admin)   return <div className="p-8 text-sm text-text-muted">Not Admin</div>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold font-nunito text-text-primary">Admin dashboard</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSignOut}
            className="text-sm border border-border rounded-full px-4 py-1.5 text-text-secondary font-nunito font-bold"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total',       value: appointments.length },
            { label: 'Pending',     value: countFor('pending') },
            { label: 'Today',       value: appointments.filter(a => a.date === new Date().toISOString().slice(0, 10)).length },
            { label: 'Completed',   value: countFor('completed') },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-border px-4 py-3">
              <p className="text-xs text-text-muted mb-1">{s.label}</p>
              <p className="text-2xl font-bold font-nunito text-text-primary">{s.value}</p>
            </div>
          ))}
        </div>

        <div className={`grid gap-4 ${selected ? 'grid-cols-[1fr_360px]' : 'grid-cols-1'}`}>
          {/* Left — list */}
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            {/* Search */}
            <div className="px-4 pt-4 pb-3 border-b border-border">
              <input
                type="text"
                placeholder="Search dog, breed, or owner…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full text-sm border border-border rounded-full px-4 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>

            {/* Tabs */}
            <div className="flex gap-0 overflow-x-auto border-b border-border">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-xs font-nunito font-bold whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-brand text-brand'
                      : 'border-transparent text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {STATUS_LABELS[tab] ?? 'All'} <span className="ml-1 opacity-60">{countFor(tab)}</span>
                </button>
              ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-border">
              {filtered.length === 0 && (
                <p className="text-center text-sm text-text-muted py-10">No appointments found</p>
              )}
              {filtered.map(a => (
                <div
                  key={a.id}
                  onClick={() => setSelected(selected?.id === a.id ? null : a)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${selected?.id === a.id ? 'bg-brand-pale' : ''}`}
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-brand-pale flex items-center justify-center text-xs font-bold font-nunito text-brand flex-shrink-0">
                    {initials(a.dog_name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold font-nunito text-text-primary">{a.dog_name}</span>
                      <span className="text-xs text-text-muted">{a.breed}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${STATUS_STYLES[a.status]}`}>
                        {STATUS_LABELS[a.status]}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted truncate"> · {formatDate(a.date)}</p>
                  </div>

                  {/* Quick actions */}
                  <div className="flex gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    {a.status === 'pending' && <>
                      <button onClick={() => updateStatus(a.id, 'confirmed')} className="text-xs px-2.5 py-1 rounded-full border border-green-300 text-green-700 font-bold hover:bg-green-50">Confirm</button>
                      <button onClick={() => updateStatus(a.id, 'declined')} className="text-xs px-2.5 py-1 rounded-full border border-red-200 text-red-600 font-bold hover:bg-red-50">Decline</button>
                    </>}
                    {a.status === 'confirmed' && <>
                      <button onClick={() => updateStatus(a.id, 'cancelled')} className="text-xs px-2.5 py-1 rounded-full border border-border text-text-muted font-bold hover:bg-gray-50">Cancel</button>
                    </>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — detail panel */}
          {selected && (
            <div className="bg-white rounded-2xl border border-border p-5 self-start sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-nunito font-bold text-base text-text-primary">Appointment detail</h2>
                <button onClick={() => setSelected(null)} className="text-text-muted hover:text-text-secondary">
                  <i className="ti ti-x text-[18px]" />
                </button>
              </div>

              {/* Dog + owner */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                <div className="w-12 h-12 rounded-full bg-brand-pale flex items-center justify-center font-nunito font-extrabold text-base text-brand">
                  {initials(selected.dog_name)}
                </div>
                <div>
                  <p className="font-nunito font-bold text-text-primary">{selected.dog_name} <span className="font-normal text-text-muted text-sm">· {selected.breed}</span></p>
                  <p className="text-sm text-text-muted">{}</p>
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-3 mb-4 text-sm">
                {[
                  { label: 'Service',  value: selected.service_id },
                  { label: 'Date',     value: `${formatDate(selected.date)} at ${selected.time}` },
                  { label: 'Price',    value: `$${selected}` },
                  { label: 'Email',    value: selected.email },
                  { label: 'Status',   value: (
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${STATUS_STYLES[selected.status]}`}>
                      {STATUS_LABELS[selected.status]}
                    </span>
                  )},
                ].map(f => (
                  <div key={f.label} className="flex justify-between items-center">
                    <span className="text-text-muted">{f.label}</span>
                    <span className="font-bold font-nunito text-text-primary text-right">{f.value}</span>
                  </div>
                ))}
              </div>

              {/* Notes */}
              {selected && (
                <div className="bg-gray-50 rounded-xl px-3 py-2.5 mb-4">
                  <p className="text-xs text-text-muted mb-1 uppercase tracking-wide">Notes</p>
                  <p className="text-sm text-text-primary leading-relaxed">{}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {selected.status === 'pending' && <>
                  <button onClick={() => updateStatus(selected.id, 'confirmed')} className="w-full py-2.5 rounded-full bg-brand text-white text-sm font-bold font-nunito">Confirm appointment</button>
                  <button onClick={() => updateStatus(selected.id, 'declined')} className="w-full py-2.5 rounded-full border border-red-200 text-red-600 text-sm font-bold font-nunito">Decline</button>
                </>}
                {selected.status === 'confirmed' && <>
                  <button onClick={() => updateStatus(selected.id, 'cancelled')} className="w-full py-2.5 rounded-full border border-border text-text-secondary text-sm font-bold font-nunito">Cancel</button>
                </>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}