'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import type { Booking } from '@/types'
import { useServices } from '@/lib/hooks/useServices'
import { NOTIFY_STATUSES, calgaryNowParts, calgaryTime, formatLongDate, type BookingStatus } from '@/components/admin/lib'
import { ConfirmDialog, btn, iconBtn } from '@/components/admin/ui'
import TodayPanel from '@/components/admin/TodayPanel'
import BookingsPanel from '@/components/admin/BookingsPanel'
import BookingDetail, { type BookingAction } from '@/components/admin/BookingDetail'
import CalendarPanel from '@/components/admin/CalendarPanel'
import ServicesPanel from '@/components/admin/ServicesPanel'
import NewBookingSheet, { type NewBookingMode } from '@/components/admin/NewBookingSheet'

type AdminView = 'today' | 'bookings' | 'calendar' | 'services'

const VIEWS: { key: AdminView; label: string; icon: string }[] = [
  { key: 'today',    label: 'Today',    icon: 'ti-layout-dashboard' },
  { key: 'bookings', label: 'Bookings', icon: 'ti-list-details' },
  { key: 'calendar', label: 'Calendar', icon: 'ti-calendar-month' },
  { key: 'services', label: 'Services', icon: 'ti-scissors' },
]

const ACTION_STATUS: Record<BookingAction, BookingStatus> = {
  decline:   'declined',
  cancel:    'cancelled',
  completed: 'completed',
}

const ACTION_DIALOG: Record<BookingAction, {
  tone: 'danger' | 'success'; icon: string; title: string; body: string; confirmLabel: string; cancelLabel: string
}> = {
  decline: {
    tone: 'danger', icon: 'ti-alert-triangle',
    title: 'Decline this booking?',
    body: 'The customer will get an email saying their booking was declined.',
    confirmLabel: 'Yes, decline', cancelLabel: 'Keep booking',
  },
  cancel: {
    tone: 'danger', icon: 'ti-alert-triangle',
    title: 'Cancel this appointment?',
    body: 'This confirmed appointment will be marked as cancelled and the customer will get an email.',
    confirmLabel: 'Yes, cancel it', cancelLabel: 'Keep appointment',
  },
  completed: {
    tone: 'success', icon: 'ti-circle-check',
    title: 'Mark as completed?',
    body: 'This appointment will be moved to completed.',
    confirmLabel: 'Yes, mark completed', cancelLabel: 'Not yet',
  },
}

export default function AdminPage() {
  const router = useRouter()
  const [view, setView] = useState<AdminView>('today')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [appointments, setAppointments] = useState<Booking[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<{ type: BookingAction; id: string } | null>(null)
  const { services, serviceMap } = useServices('eng')
  const [newSheet, setNewSheet] = useState<{ open: boolean; mode: NewBookingMode }>({ open: false, mode: 'add' })
  const todayKey = useMemo(() => calgaryNowParts().key, [])

  const serviceName = useCallback(
    (b: Booking) => serviceMap[b.service_id] ?? b.service_name ?? '',
    [serviceMap],
  )

  const loadBookings = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch('/api/admin/bookings')
      if (!res.ok) throw new Error('Failed to fetch bookings')
      const data = await res.json()
      setAppointments(data.bookings ?? [])
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadBookings() }, [loadBookings])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  async function updateStatus(id: string, status: BookingStatus) {
    setBusyId(id)
    setStatusError(null)
    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to update status')
      }
      setAppointments(prev => prev.map(a => (a.id === id ? { ...a, status } : a)))

      // Email the customer (fire and forget). Only statuses with a template.
      const booking = appointments.find(a => a.id === id)
      if (booking?.email && NOTIFY_STATUSES.has(status)) {
        fetch('/api/admin/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email:    booking.email,
            dog_name: booking.dog_name,
            date:     formatLongDate(booking.date_time),
            time:     calgaryTime(booking.date_time),
            phone:    booking.phone ?? '',
            kakaoid:  booking.kakaoid ?? '',
            status,
          }),
        }).catch(err => console.error('Email notify failed:', err))
      }
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusyId(null)
    }
  }

  const selected = appointments.find(a => a.id === selectedId) ?? null
  const pendingCount = appointments.filter(a => a.status === 'pending').length
  const dialog = pendingAction ? ACTION_DIALOG[pendingAction.type] : null

  function select(b: Booking) {
    setStatusError(null)
    setSelectedId(b.id)
  }

  return (
    <div className="app-shell flex flex-col">
      {/* flex-1 here (and flex-col on the shell, which has min-height: 100%) pins the phone tab bar to the bottom on short pages */}
      <div className="page-full-bleed flex-1 flex flex-col">
        {/* Header */}
        <div className="max-w-6xl w-full mx-auto px-4 md:px-6 pt-1 pb-3 md:pb-5 flex items-center justify-between gap-3">
          <div>
            <h1 className="font-nunito font-extrabold text-2xl text-text-primary">
              {VIEWS.find(v => v.key === view)?.label}
            </h1>
            <p className="text-xs text-text-secondary">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Edmonton' })}
            </p>
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-white border border-border rounded-full p-1" aria-label="Admin sections">
            {VIEWS.map(v => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                aria-current={view === v.key ? 'page' : undefined}
                className={`relative inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-sm font-bold font-nunito transition-colors ${
                  view === v.key ? 'bg-brand text-white' : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                }`}
              >
                <i className={`ti ${v.icon}`} aria-hidden="true" /> {v.label}
                {v.key === 'today' && pendingCount > 0 && (
                  <span className={`ml-0.5 min-w-5 h-5 px-1 rounded-full text-[11px] flex items-center justify-center ${
                    view === v.key ? 'bg-white text-brand' : 'bg-amber-400 text-white'
                  }`}>{pendingCount}</span>
                )}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <span className="hidden md:inline-flex gap-1 mr-1">
              <button onClick={() => setNewSheet({ open: true, mode: 'link' })} className={btn.secondary}>
                <i className="ti ti-link" aria-hidden="true" /> Send link
              </button>
              <button onClick={() => setNewSheet({ open: true, mode: 'add' })} className={btn.primary}>
                <i className="ti ti-plus" aria-hidden="true" /> New booking
              </button>
            </span>
            <button onClick={loadBookings} className={iconBtn} aria-label="Refresh bookings" title="Refresh">
              <i className={`ti ti-refresh text-lg ${loading ? 'animate-spin' : ''}`} />
            </button>
            <span className="hidden sm:block">
              <button onClick={handleSignOut} className={btn.secondary}>
                <i className="ti ti-logout" aria-hidden="true" /> Sign out
              </button>
            </span>
            <span className="sm:hidden">
              <button onClick={handleSignOut} className={iconBtn} aria-label="Sign out">
                <i className="ti ti-logout text-lg" />
              </button>
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-6 pb-6">
          {view === 'services' ? (
            <ServicesPanel />
          ) : loading && appointments.length === 0 ? (
            <p className="py-10 text-center text-sm text-text-secondary">Loading bookings…</p>
          ) : loadError ? (
            <div className="py-10 text-center">
              <p className="text-sm text-red-500 mb-3">{loadError}</p>
              <button onClick={loadBookings} className={btn.secondary}>Try again</button>
            </div>
          ) : view === 'today' ? (
            <TodayPanel
              appointments={appointments}
              todayKey={todayKey}
              serviceName={serviceName}
              busyId={busyId}
              onSelect={select}
              onConfirm={id => updateStatus(id, 'confirmed')}
              onDecline={id => setPendingAction({ type: 'decline', id })}
            />
          ) : view === 'bookings' ? (
            <BookingsPanel
              appointments={appointments}
              todayKey={todayKey}
              serviceName={serviceName}
              selectedId={selectedId}
              onSelect={select}
              onRemoved={ids => {
                setAppointments(prev => prev.filter(a => !ids.includes(a.id)))
                if (selectedId && ids.includes(selectedId)) setSelectedId(null)
              }}
            />
          ) : (
            <CalendarPanel appointments={appointments} serviceName={serviceName} onSelect={select} />
          )}

          {statusError && !selected && (
            <p className="mt-3 text-sm text-red-500 text-center" role="alert">{statusError}</p>
          )}
        </div>

        {/* Phone: new booking button floats above the tab bar */}
        {view !== 'services' && (
          <div className="md:hidden sticky bottom-[72px] z-40 flex justify-end px-4 pointer-events-none -mt-14">
            <button
              onClick={() => setNewSheet({ open: true, mode: 'add' })}
              className="pointer-events-auto w-14 h-14 rounded-full bg-brand text-white shadow-[0_10px_24px_-8px_rgba(255,107,26,0.8)] flex items-center justify-center active:scale-95 transition-transform"
              aria-label="New booking or link"
            >
              <i className="ti ti-plus text-[26px]" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Phone tab bar */}
        <nav
          className="md:hidden sticky bottom-0 z-40 bg-white/95 backdrop-blur border-t border-border grid grid-cols-4"
          aria-label="Admin sections"
        >
          {VIEWS.map(v => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              aria-current={view === v.key ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-0.5 min-h-14 text-[11px] font-bold font-nunito ${
                view === v.key ? 'text-brand' : 'text-text-secondary'
              }`}
            >
              <i className={`ti ${v.icon} text-[22px]`} aria-hidden="true" />
              {v.label}
              {v.key === 'today' && pendingCount > 0 && (
                <span className="absolute top-1.5 left-1/2 ml-2 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-white text-[10px] flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <NewBookingSheet
        open={newSheet.open}
        initialMode={newSheet.mode}
        appointments={appointments}
        services={services}
        todayKey={todayKey}
        onClose={() => setNewSheet(s => ({ ...s, open: false }))}
        onCreated={booking => {
          setAppointments(prev => [...prev, booking])
          setNewSheet(s => ({ ...s, open: false }))
          setSelectedId(booking.id)
        }}
      />

      <BookingDetail
        booking={selected}
        serviceName={selected ? serviceName(selected) : ''}
        busy={busyId === selected?.id}
        error={statusError}
        onClose={() => { setSelectedId(null); setStatusError(null) }}
        onConfirm={id => updateStatus(id, 'confirmed')}
        onAction={(type, id) => setPendingAction({ type, id })}
      />

      {dialog && pendingAction && (
        <ConfirmDialog
          open
          {...dialog}
          onConfirm={() => {
            updateStatus(pendingAction.id, ACTION_STATUS[pendingAction.type])
            setPendingAction(null)
          }}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  )
}
