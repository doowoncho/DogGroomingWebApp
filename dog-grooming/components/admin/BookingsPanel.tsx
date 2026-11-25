'use client'

import { useMemo, useState } from 'react'
import type { Booking } from '@/types'
import {
  CLEARABLE_STATUSES, STATUS_LABELS, byDateAsc, calgaryDateKey, calgaryNowParts, calgaryTime, dateKey, dayHeading, groupByDay,
} from './lib'
import { ConfirmDialog, DogAvatar, EmptyState, StatusPill, btn, cardCls } from './ui'

const STATUS_TABS = ['all', 'pending', 'confirmed', 'completed', 'cancelled', 'declined'] as const
type StatusTab = typeof STATUS_TABS[number]

const DATE_RANGES = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'week',     label: 'This week' },
  { key: 'month',    label: 'This month' },
  { key: 'year',     label: 'This year' },
  { key: 'all',      label: 'All time' },
] as const
type DateRangeKey = typeof DATE_RANGES[number]['key']

export default function BookingsPanel({ appointments, todayKey, serviceName, selectedId, onSelect, onRemoved }: {
  appointments: Booking[]
  todayKey: string
  serviceName: (b: Booking) => string
  selectedId: string | null
  onSelect: (b: Booking) => void
  onRemoved: (ids: string[]) => void
}) {
  const [status, setStatus] = useState<StatusTab>('all')
  const [range, setRange] = useState<DateRangeKey>('upcoming')
  const [search, setSearch] = useState('')

  // Bulk "clear old bookings"
  const [selectMode, setSelectMode] = useState(false)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Inclusive Calgary-day bounds for the range. YYYY-MM-DD compares lexicographically.
  const bounds = useMemo(() => {
    if (range === 'all') return null
    if (range === 'upcoming') return { start: todayKey, end: '9999-12-31' }
    const { y, m, d } = calgaryNowParts()
    if (range === 'year') return { start: `${y}-01-01`, end: `${y}-12-31` }
    if (range === 'month') return { start: dateKey(y, m, 1), end: dateKey(y, m, new Date(y, m + 1, 0).getDate()) }
    const dow = new Date(y, m, d).getDay() // week: Sunday–Saturday
    const s = new Date(y, m, d - dow)
    const e = new Date(y, m, d - dow + 6)
    return { start: dateKey(s.getFullYear(), s.getMonth(), s.getDate()), end: dateKey(e.getFullYear(), e.getMonth(), e.getDate()) }
  }, [range, todayKey])

  const inRange = useMemo(() => {
    if (!bounds) return appointments
    return appointments.filter(a => {
      const k = calgaryDateKey(a.date_time)
      return k >= bounds.start && k <= bounds.end
    })
  }, [appointments, bounds])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return inRange
      .filter(a => status === 'all' || a.status === status)
      .filter(a =>
        !q ||
        a.dog_name.toLowerCase().includes(q) ||
        a.breed?.toLowerCase().includes(q) ||
        a.phone?.toLowerCase().includes(q) ||
        a.kakaoid?.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q),
      )
      .sort(byDateAsc)
  }, [inRange, status, search])

  const countFor = (t: StatusTab) => (t === 'all' ? inRange.length : inRange.filter(a => a.status === t).length)
  const clearableInView = filtered.filter(a => CLEARABLE_STATUSES.has(a.status))

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function exitSelect() {
    setSelectMode(false)
    setChecked(new Set())
    setDeleteError(null)
  }

  async function handleBulkDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(checked) }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to delete bookings')
      }
      const { deletedIds, skippedIds }: { deletedIds: string[]; skippedIds: string[] } = await res.json()
      onRemoved(deletedIds)
      setChecked(prev => {
        const next = new Set(prev)
        deletedIds.forEach(id => next.delete(id))
        return next
      })
      if (skippedIds.length > 0) {
        setDeleteError(`${skippedIds.length} booking${skippedIds.length > 1 ? 's' : ''} couldn't be deleted (no longer eligible).`)
      } else {
        setConfirmDelete(false)
        setSelectMode(false)
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setDeleting(false)
    }
  }

  const chip = (active: boolean) =>
    `inline-flex items-center gap-1 min-h-9 px-3.5 rounded-full text-xs font-bold font-nunito whitespace-nowrap transition-colors ${
      active ? 'bg-text-primary text-white' : 'bg-white border border-border text-text-secondary hover:text-text-primary'
    }`

  return (
    <div className="space-y-3">
      {/* Search + select */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <i className="ti ti-search absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search dog, breed, or contact"
            aria-label="Search by dog, breed, phone, KakaoID, or email"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full min-h-11 rounded-full border border-border bg-white pl-10 pr-4 text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>
        {!selectMode && (
          <button onClick={() => setSelectMode(true)} className={btn.secondary} aria-label="Select bookings to clear">
            <i className="ti ti-checkbox" aria-hidden="true" />
            <span className="hidden sm:inline">Select</span>
          </button>
        )}
      </div>

      {/* Range */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4">
        {DATE_RANGES.map(r => (
          <button key={r.key} onClick={() => setRange(r.key)} className={chip(range === r.key)}>{r.label}</button>
        ))}
      </div>

      {/* Status */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar border-b border-border -mx-4 px-4">
        {STATUS_TABS.map(t => (
          <button
            key={t}
            onClick={() => setStatus(t)}
            className={`min-h-11 px-3 text-xs font-bold font-nunito whitespace-nowrap border-b-2 -mb-px transition-colors ${
              status === t ? 'border-brand text-brand' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {t === 'all' ? 'All' : STATUS_LABELS[t]} <span className="ml-0.5 opacity-60">{countFor(t)}</span>
          </button>
        ))}
      </div>

      {/* Select-mode toolbar */}
      {selectMode && (
        <div className="rounded-2xl bg-brand-muted border border-brand/20 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold font-nunito text-text-primary">{checked.size} selected</span>
              <button
                onClick={() => setChecked(new Set(clearableInView.map(a => a.id)))}
                disabled={clearableInView.length === 0}
                className="text-xs font-bold font-nunito text-brand hover:underline disabled:opacity-40"
              >
                Select all clearable ({clearableInView.length})
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(true)} disabled={checked.size === 0} className={btn.danger}>
                <i className="ti ti-trash" aria-hidden="true" /> Clear
              </button>
              <button onClick={exitSelect} className={btn.secondary}>Done</button>
            </div>
          </div>
          <p className="text-[11px] text-text-secondary">
            Only completed, cancelled, or declined bookings can be cleared. Pending and confirmed appointments can never be removed here.
          </p>
        </div>
      )}

      {/* List — overflow-clip (not hidden) so the sticky day headers still stick */}
      <div className={`${cardCls} overflow-clip`}>
        {filtered.length === 0 ? (
          <EmptyState icon="ti-calendar-off" title="No bookings found" body="Try another date range or status." />
        ) : (
          groupByDay(filtered).map(([key, list]) => {
            const isToday = key === todayKey
            return (
              <div key={key}>
                <p
                  className={`sticky top-0 z-[1] px-4 py-1.5 text-[11px] font-bold font-nunito uppercase tracking-wide border-b border-border ${
                    isToday ? 'bg-brand-pale text-brand' : 'bg-surface text-text-secondary'
                  }`}
                >
                  {dayHeading(key, todayKey)}
                </p>
                <ul className="divide-y divide-border">
                  {list.map(a => {
                    const clearable = CLEARABLE_STATUSES.has(a.status)
                    const isChecked = checked.has(a.id)
                    const active = selectMode ? isChecked : selectedId === a.id
                    return (
                      <li key={a.id}>
                        <button
                          onClick={() => (selectMode ? clearable && toggle(a.id) : onSelect(a))}
                          disabled={selectMode && !clearable}
                          className={`flex items-center gap-3 w-full text-left px-4 py-3 min-h-16 transition-colors ${
                            selectMode && !clearable ? 'opacity-40 cursor-not-allowed' : 'hover:bg-surface active:bg-surface-secondary'
                          } ${active ? 'bg-brand-pale' : ''} ${a.status === 'pending' && !active ? 'bg-amber-50/50' : ''}`}
                        >
                          {selectMode && (
                            <span
                              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                                isChecked ? 'bg-brand border-brand text-white' : 'border-gray-300 bg-white'
                              }`}
                              aria-hidden="true"
                            >
                              {isChecked && <i className="ti ti-check text-xs" />}
                            </span>
                          )}
                          <span className="w-[70px] flex-shrink-0 whitespace-nowrap text-[13px] sm:text-sm font-nunito font-bold text-text-secondary">{calgaryTime(a.date_time)}</span>
                          <DogAvatar name={a.dog_name} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block font-nunito font-bold text-sm text-text-primary truncate">
                              {a.dog_name}
                              {a.breed && <span className="font-normal text-text-secondary"> · {a.breed}</span>}
                            </span>
                            <span className="block text-xs text-text-secondary truncate">{serviceName(a)}</span>
                          </span>
                          <StatusPill status={a.status} />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        tone="danger"
        icon="ti-trash"
        title={`Delete ${checked.size} booking${checked.size !== 1 ? 's' : ''}?`}
        body={`This permanently removes ${checked.size === 1 ? 'this booking' : 'these bookings'}. Only completed, cancelled, and declined bookings are affected. This can't be undone.`}
        confirmLabel="Yes, delete"
        cancelLabel="Keep bookings"
        busy={deleting}
        error={deleteError}
        onConfirm={handleBulkDelete}
        onCancel={() => { setConfirmDelete(false); setDeleteError(null) }}
      />
    </div>
  )
}
