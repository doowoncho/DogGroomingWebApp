'use client'

import { useMemo, useState } from 'react'
import type { Booking } from '@/types'
import { STATUS_DOT, STATUS_LABELS, calgaryDateKey, calgaryNowParts, calgaryTime, dateKey, dayHeading } from './lib'
import { AgendaRow } from './TodayPanel'
import { Sheet, btn, cardCls, iconBtn } from './ui'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MAX_VISIBLE = 3

type Cell = { day: number; y: number; m: number; inMonth: boolean }

/** Month view, everything bucketed in Calgary time. Phones show dots; tap a day for its list. */
export default function CalendarPanel({ appointments, serviceName, onSelect }: {
  appointments: Booking[]
  serviceName: (b: Booking) => string
  onSelect: (b: Booking) => void
}) {
  const today = useMemo(() => calgaryNowParts(), [])
  const [year, setYear] = useState(today.y)
  const [month, setMonth] = useState(today.m) // 0-indexed
  const [dayKey, setDayKey] = useState<string | null>(null)

  const monthAppointments = useMemo(
    () => appointments.filter(a => {
      const [y, m] = calgaryDateKey(a.date_time).split('-').map(Number)
      return y === year && m === month + 1
    }),
    [appointments, year, month],
  )

  const eventsByDay = useMemo(() => {
    const map: Record<string, Booking[]> = {}
    monthAppointments.forEach(a => {
      const k = calgaryDateKey(a.date_time)
      ;(map[k] ??= []).push(a)
    })
    Object.values(map).forEach(list => list.sort((a, b) => a.date_time.localeCompare(b.date_time)))
    return map
  }, [monthAppointments])

  const stats = [
    { label: 'This month', value: monthAppointments.length },
    { label: 'Pending',    value: monthAppointments.filter(a => a.status === 'pending').length },
    { label: 'Confirmed',  value: monthAppointments.filter(a => a.status === 'confirmed').length },
    { label: 'Completed',  value: monthAppointments.filter(a => a.status === 'completed').length },
  ]

  const cells: Cell[] = []
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()
  for (let i = firstWeekday - 1; i >= 0; i--) {
    cells.push({ day: daysInPrev - i, y: month === 0 ? year - 1 : year, m: month === 0 ? 11 : month - 1, inMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, y: year, m: month, inMonth: true })
  let trailing = 1
  while (cells.length % 7 !== 0) {
    cells.push({ day: trailing++, y: month === 11 ? year + 1 : year, m: month === 11 ? 0 : month + 1, inMonth: false })
  }

  function shift(delta: number) {
    setDayKey(null)
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className={`${cardCls} overflow-hidden`}>
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="font-nunito font-extrabold text-base text-text-primary truncate">{monthLabel}</h2>
          <span className="hidden sm:inline text-[10px] font-bold font-nunito text-text-secondary uppercase tracking-wide bg-surface-secondary rounded-full px-2 py-0.5">
            Calgary time
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => { setDayKey(null); setYear(today.y); setMonth(today.m) }} className={`${btn.ghost} px-3`}>Today</button>
          <button onClick={() => shift(-1)} aria-label="Previous month" className={iconBtn}><i className="ti ti-chevron-left text-lg" /></button>
          <button onClick={() => shift(1)} aria-label="Next month" className={iconBtn}><i className="ti ti-chevron-right text-lg" /></button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 px-3 sm:px-4 py-2.5 border-b border-border bg-surface">
        {stats.map(s => (
          <div key={s.label}>
            <p className="text-[10px] text-text-secondary uppercase tracking-wide truncate">{s.label}</p>
            <p className="text-lg font-extrabold font-nunito text-text-primary">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map(w => (
          <div key={w} className="py-2 text-[10px] font-bold font-nunito text-text-secondary uppercase tracking-wide text-center">
            <span className="sm:hidden">{w[0]}</span>
            <span className="hidden sm:inline">{w}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          const key = dateKey(cell.y, cell.m, cell.day)
          const events = cell.inMonth ? eventsByDay[key] ?? [] : []
          const isToday = key === today.key
          const visible = events.slice(0, MAX_VISIBLE)
          const overflow = events.length - visible.length
          return (
            <div
              key={i}
              onClick={() => events.length > 0 && setDayKey(key)}
              className={`min-h-[60px] sm:min-h-[104px] border-b border-r border-border p-1 sm:p-1.5 ${
                cell.inMonth ? 'bg-white' : 'bg-surface'
              } ${events.length > 0 ? 'cursor-pointer sm:cursor-default hover:bg-surface sm:hover:bg-white' : ''}`}
            >
              <div className="flex justify-center mb-1">
                <span
                  className={`text-xs font-bold font-nunito w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-brand text-white' : cell.inMonth ? 'text-text-primary' : 'text-text-muted/60'
                  }`}
                >
                  {cell.day}
                </span>
              </div>

              {/* Phone: dots */}
              <div className="flex flex-wrap justify-center gap-0.5 sm:hidden">
                {events.slice(0, 4).map(ev => (
                  <span key={ev.id} className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[ev.status] ?? 'bg-gray-300'}`} />
                ))}
                {events.length > 4 && <span className="text-[9px] leading-none font-bold text-text-secondary">+</span>}
              </div>

              {/* Desktop: event chips */}
              <div className="hidden sm:flex flex-col gap-0.5">
                {visible.map(ev => (
                  <button
                    key={ev.id}
                    onClick={e => { e.stopPropagation(); onSelect(ev) }}
                    title={`${ev.dog_name} · ${calgaryTime(ev.date_time)} · ${STATUS_LABELS[ev.status]}`}
                    className="flex items-center gap-1 text-[11px] font-nunito font-bold px-1 py-0.5 rounded hover:bg-surface-secondary text-left min-w-0"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[ev.status] ?? 'bg-gray-300'}`} />
                    <span className="text-text-secondary flex-shrink-0">{calgaryTime(ev.date_time).replace(':00', '')}</span>
                    <span className="text-text-primary truncate">{ev.dog_name}</span>
                  </button>
                ))}
                {overflow > 0 && (
                  <button
                    onClick={e => { e.stopPropagation(); setDayKey(key) }}
                    className="text-[11px] font-nunito font-bold text-brand px-1 text-left hover:underline"
                  >
                    +{overflow} more
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {monthAppointments.length === 0 && (
        <p className="text-center text-sm text-text-secondary py-4">No appointments this month</p>
      )}

      <Sheet
        open={dayKey !== null}
        onClose={() => setDayKey(null)}
        title={dayKey ? dayHeading(dayKey, today.key) : ''}
        subtitle={dayKey ? (n => `${n} booking${n === 1 ? '' : 's'}`)((eventsByDay[dayKey] ?? []).length) : undefined}
      >
        <ul className="-mx-5 divide-y divide-border">
          {(dayKey ? eventsByDay[dayKey] ?? [] : []).map(ev => (
            <li key={ev.id}>
              <AgendaRow
                booking={ev}
                label={calgaryTime(ev.date_time)}
                serviceName={serviceName(ev)}
                onSelect={b => { setDayKey(null); onSelect(b) }}
              />
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  )
}
