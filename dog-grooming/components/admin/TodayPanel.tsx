'use client'

import { useMemo } from 'react'
import type { Booking } from '@/types'
import { addDaysKey, byDateAsc, calgaryDateKey, calgaryTime, dayHeading, groupByDay } from './lib'
import { DogAvatar, EmptyState, SectionHeader, StatusPill, btn, cardCls } from './ui'

const UPCOMING_DAYS = 7

export default function TodayPanel({ appointments, todayKey, serviceName, busyId, onSelect, onConfirm, onDecline }: {
  appointments: Booking[]
  todayKey: string
  serviceName: (b: Booking) => string
  busyId: string | null
  onSelect: (b: Booking) => void
  onConfirm: (id: string) => void
  onDecline: (id: string) => void
}) {
  const nowIso = new Date().toISOString()
  const weekEndKey = addDaysKey(todayKey, UPCOMING_DAYS)
  const monthPrefix = todayKey.slice(0, 7)

  const { pending, today, upcoming, stats } = useMemo(() => {
    const sorted = [...appointments].sort(byDateAsc)
    const pending = sorted.filter(a => a.status === 'pending')
    const today = sorted.filter(a =>
      calgaryDateKey(a.date_time) === todayKey && ['confirmed', 'completed', 'pending'].includes(a.status),
    )
    const upcoming = sorted.filter(a => {
      const k = calgaryDateKey(a.date_time)
      return k > todayKey && k <= weekEndKey && a.status === 'confirmed'
    })
    const stats = {
      pending: pending.length,
      today: today.filter(a => a.status !== 'pending').length,
      week: upcoming.length,
      completedMonth: sorted.filter(a => a.status === 'completed' && calgaryDateKey(a.date_time).startsWith(monthPrefix)).length,
    }
    return { pending, today, upcoming, stats }
  }, [appointments, todayKey, weekEndKey, monthPrefix])

  const nextUpId = today.find(a => a.status === 'confirmed' && a.date_time >= nowIso)?.id

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Stat label="Needs action" value={stats.pending} icon="ti-bell" highlight={stats.pending > 0} />
        <Stat label="Today" value={stats.today} icon="ti-calendar-event" />
        <Stat label={`Next ${UPCOMING_DAYS} days`} value={stats.week} icon="ti-calendar-week" />
        <Stat label="Done this month" value={stats.completedMonth} icon="ti-circle-check" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        {/* Needs action */}
        <section>
          <SectionHeader icon="ti-bell" title="Needs action" count={pending.length} tone={pending.length ? 'warning' : 'default'} />
          <div className={`${cardCls} overflow-hidden ${pending.length ? 'border-amber-200 ring-1 ring-amber-100' : ''}`}>
            {pending.length === 0 ? (
              <EmptyState icon="ti-mood-happy" title="You're all caught up" body="New booking requests show up here." />
            ) : (
              <ul className="divide-y divide-border">
                {pending.map(a => {
                  const past = a.date_time < nowIso
                  const busy = busyId === a.id
                  return (
                    <li key={a.id} className="p-3.5">
                      <button onClick={() => onSelect(a)} className="flex items-center gap-3 w-full text-left">
                        <DogAvatar name={a.dog_name} />
                        <div className="min-w-0 flex-1">
                          <p className="font-nunito font-bold text-[15px] text-text-primary truncate">
                            {a.dog_name}
                            {a.breed && <span className="font-normal text-text-secondary text-sm"> · {a.breed}</span>}
                          </p>
                          <p className="text-xs text-text-secondary truncate">
                            {dayHeading(calgaryDateKey(a.date_time), todayKey)}, {calgaryTime(a.date_time)} · {serviceName(a)}
                          </p>
                        </div>
                        {past && (
                          <span className="text-[11px] font-bold text-red-600 bg-red-50 rounded-full px-2 py-1 flex-shrink-0">Past date</span>
                        )}
                      </button>
                      <div className="flex gap-2 mt-3 pl-[52px]">
                        <button onClick={() => onConfirm(a.id)} disabled={busy} className={`${btn.primary} flex-1 sm:flex-none`}>
                          <i className="ti ti-check" aria-hidden="true" /> {busy ? 'Saving…' : 'Confirm'}
                        </button>
                        <button onClick={() => onDecline(a.id)} disabled={busy} className={`${btn.secondary} flex-1 sm:flex-none`}>
                          Decline
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>

        <div className="space-y-6">
          {/* Today's agenda */}
          <section>
            <SectionHeader icon="ti-calendar-event" title="Today" tone="brand" count={today.length} />
            <div className={`${cardCls} overflow-hidden`}>
              {today.length === 0 ? (
                <EmptyState icon="ti-coffee" title="Nothing booked today" />
              ) : (
                <ul className="divide-y divide-border">
                  {today.map(a => {
                    const done = a.status === 'completed' || (a.status === 'confirmed' && a.date_time < nowIso && a.id !== nextUpId)
                    const isNext = a.id === nextUpId
                    return (
                      <li key={a.id}>
                        <AgendaRow
                          booking={a}
                          label={calgaryTime(a.date_time)}
                          serviceName={serviceName(a)}
                          onSelect={onSelect}
                          dim={done}
                          accent={isNext}
                        />
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* Upcoming */}
          <section>
            <SectionHeader icon="ti-calendar-week" title="Coming up" count={upcoming.length} />
            <div className={`${cardCls} overflow-hidden`}>
              {upcoming.length === 0 ? (
                <EmptyState icon="ti-calendar" title={`No confirmed bookings in the next ${UPCOMING_DAYS} days`} />
              ) : (
                groupByDay(upcoming).map(([key, list]) => (
                  <div key={key}>
                    <p className="px-4 pt-3 pb-1 text-[11px] font-bold font-nunito uppercase tracking-wide text-text-secondary">
                      {dayHeading(key, todayKey)}
                    </p>
                    <ul>
                      {list.map(a => (
                        <li key={a.id}>
                          <AgendaRow booking={a} label={calgaryTime(a.date_time)} serviceName={serviceName(a)} onSelect={onSelect} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, icon, highlight }: { label: string; value: number; icon: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 border ${highlight ? 'bg-amber-50 border-amber-200' : 'bg-white border-border'}`}>
      <p className={`flex items-center gap-1.5 text-xs truncate ${highlight ? 'text-amber-800' : 'text-text-secondary'}`}>
        <i className={`ti ${icon}`} aria-hidden="true" /> {label}
      </p>
      <p className={`text-xl sm:text-2xl font-extrabold font-nunito sm:mt-0.5 ${highlight ? 'text-amber-900' : 'text-text-primary'}`}>{value}</p>
    </div>
  )
}

export function AgendaRow({ booking: a, label, serviceName, onSelect, dim, accent }: {
  booking: Booking
  label: string
  serviceName: string
  onSelect: (b: Booking) => void
  dim?: boolean
  accent?: boolean
}) {
  return (
    <button
      onClick={() => onSelect(a)}
      className={`flex items-center gap-3 w-full text-left px-4 py-3 min-h-14 transition-colors hover:bg-surface active:bg-surface-secondary ${
        accent ? 'bg-brand-muted' : ''
      } ${dim ? 'opacity-55' : ''}`}
    >
      <span className={`w-[70px] flex-shrink-0 whitespace-nowrap text-[13px] sm:text-sm font-nunito font-bold ${accent ? 'text-brand' : 'text-text-secondary'}`}>
        {label}
      </span>
      <span className={`w-1 self-stretch rounded-full ${accent ? 'bg-brand' : 'bg-border'}`} />
      <span className="min-w-0 flex-1">
        <span className="block font-nunito font-bold text-sm text-text-primary truncate">
          {a.dog_name}
          {accent && <span className="ml-2 text-[11px] text-brand font-bold uppercase tracking-wide">Next up</span>}
        </span>
        <span className="block text-xs text-text-secondary truncate">{serviceName}{a.breed ? ` · ${a.breed}` : ''}</span>
      </span>
      <StatusPill status={a.status} />
    </button>
  )
}
