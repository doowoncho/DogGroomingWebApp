'use client'

import { useState, Suspense, useEffect, useRef } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/LanguageContext'
import { translations } from '@/lib/translations'
import type { BookingDraft, Service } from '@/types'
import { useServices } from '@/lib/hooks/useServices'
import { DOG_BREEDS } from '@/lib/data'
import { supabase } from '@/utils/supabase/client'
import { useSearchParams } from 'next/dist/client/components/navigation'
import BreedAutoComplete from '@/components/ui/BreedAutoComplete'

type Step = 1 | 2 | 3

const BOOKING_DRAFT_STORAGE_KEY = 'pawco:booking-draft'

// ─── DateTime helpers ─────────────────────────────────────────────────────
// A combined dateTime value is a real local timestamp: "2026-07-19T09:00:00"
// This is what gets stored directly in a single `date_time` DB column.

// "9:00 AM" -> "09:00:00"
function to24HourTime(label: string): string {
  const [time, meridiemRaw] = label.trim().split(' ')
  const meridiem = meridiemRaw?.toUpperCase()
  let [hours, minutes] = time.split(':').map(Number)
  if (meridiem === 'PM' && hours !== 12) hours += 12
  if (meridiem === 'AM' && hours === 12) hours = 0
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
}

// "09:00:00" -> "9:00 AM"
function to12HourLabel(time24: string): string {
  const [hh, mm] = time24.split(':').map(Number)
  const period = hh >= 12 ? 'PM' : 'AM'
  let hours12 = hh % 12
  if (hours12 === 0) hours12 = 12
  return `${hours12}:${String(mm).padStart(2, '0')} ${period}`
}

function splitDateTime(dt: string | null | undefined): { date: string | null; time: string | null } {
  if (!dt) return { date: null, time: null }
  const idx = dt.indexOf('T')
  if (idx === -1) return { date: dt, time: null }
  return { date: dt.slice(0, idx), time: dt.slice(idx + 1) }
}

// date: "2026-07-19", timeLabel: "9:00 AM" -> "2026-07-19T09:00:00"
function combineDateTime(date: string, timeLabel: string) {
  return `${date}T${to24HourTime(timeLabel)}`
}

function formatDateTimeDisplay(dt: string | null | undefined) {
  const { date, time } = splitDateTime(dt)
  if (!date || !time) return '—'
  const d = new Date(`${date}T${time}`)
  const dateLabel = d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const timeLabel = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${dateLabel} · ${timeLabel}`
}

// ─── Step indicator ──────────────────────────────────────────────────────────
function StepIndicator({ current, total }: { current: Step; total: number }) {
  return (
    <div className="flex items-center px-5 pt-2 pb-4">
      {Array.from({ length: total }, (_, i) => (i + 1) as Step).map((n, i) => (
        <div key={n} className="flex items-center flex-1 last:flex-none">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-bold font-nunito flex-shrink-0',
              n < current && 'bg-brand text-white',
              n === current && 'bg-text-primary text-white',
              n > current && 'bg-surface-secondary text-text-muted',
            )}
          >
            {n < current ? (
              <i className="ti ti-check text-[12px]" aria-hidden="true" />
            ) : (
              n
            )}
          </div>
          {i < total - 1 && (
            <div className={cn('flex-1 h-0.5 mx-1', n < current ? 'bg-brand' : 'bg-border')} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Step 1 — Service selection ──────────────────────────────────────────────
function ServiceStep({
  selectedServiceId,
  onSelect,
  language,
  t,
  services
}: {
  selectedServiceId: number | null
  onSelect: (s: Service) => void
  language: string
  t: any
  services: Service[]
}) {

  const selected = services.find((s) => s.id === selectedServiceId) ?? null

  return (
    <div>
      <p className="px-5 pt-1 pb-3 font-nunito font-extrabold text-[18px] text-text-primary">
        {t.booking.chooseService}
      </p>
      {services.sort((a, b) => a.order - b.order).map((svc) => {
        const active = selected?.id === svc.id
        return (
          <button
            key={svc.id}
            onClick={() => onSelect(svc)}
            aria-pressed={active}
            className={cn(
              'flex items-center gap-3 mx-5 mb-3 p-4 rounded-[18px] border-[1.5px] w-[calc(100%-40px)] transition active:scale-[0.98]',
              active ? 'border-brand bg-brand-muted' : 'border-border bg-white',
            )}
          >
            <div className="w-12 h-12 bg-brand-pale rounded-[12px] flex items-center justify-center flex-shrink-0">
              <i className={`ti ${svc.icon} text-[24px] text-brand-light`} aria-hidden="true" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-nunito font-bold text-[16px] leading-tight text-text-primary">{svc.name}</p>
              <p className="text-[13px] leading-snug text-text-muted mt-1">{svc.description}</p>
            </div>
            <p className="font-nunito font-extrabold text-[18px] text-brand">${svc.price}</p>
            <i
              className={cn(
                'ti text-[24px]',
                active ? 'ti-circle-check-filled text-brand' : 'ti-circle text-border',
              )}
              aria-hidden="true"
            />
          </button>
        )
      })}
    </div>
  )
}

// ─── Step 2 — Date & time ────────────────────────────────────────────────────
function DateTimeStep({
  value,
  onChange,
  selectedService,
  t,
  focusDate,
}: {
  value: string | null
  onChange: (dateTime: string) => void
  selectedService: Service | null
  language: string
  t: any
  /** YYYY-MM-DD to open on when nothing is picked yet (e.g. from a shared link). */
  focusDate?: string | null
}) {
  const { date: initialDate, time: initialTime24 } = splitDateTime(value)
  const startDate = initialDate ?? focusDate ?? null
  const [selectedDate, setSelectedDate] = useState<string | null>(startDate)
  const [selectedTime, setSelectedTime] = useState<string | null>(
    initialTime24 ? to12HourLabel(initialTime24) : null,
  )

  const [viewingDate, setViewingDate] = useState(() => {
    if (startDate) {
      const [y, m] = startDate.split('-').map(Number)
      return new Date(y, m - 1, 1)
    }
    return new Date()
  })
  const [slots, setSlots] = useState<{ time: string; available: boolean }[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const year = viewingDate.getFullYear()
  const month = viewingDate.getMonth()
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month
  const todayDate = isCurrentMonth ? today.getDate() : null

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthNames = t.months

  const [slotsCache, setSlotsCache] = useState<Record<string, { time: string; available: boolean }[]>>({})

  async function fetchSlots(date: string) {
    // return cached result if already fetched
    if (slotsCache[date]) {
      setSlots(slotsCache[date])
      return
    }

    setLoadingSlots(true)
    try {
      const serviceSlots = selectedService?.slots ?? 1  // ← pass selected service slots
      const res = await fetch(
        `/api/availability?date=${encodeURIComponent(date)}&slots=${serviceSlots}`
      )
      const json = await res.json()
      setSlots(json.slots ?? [])
      setSlotsCache((prev) => ({ ...prev, [date]: json.slots ?? [] }))
    } catch (err) {
      console.error('Failed to fetch slots:', err)
    } finally {
      setLoadingSlots(false)
    }
  }

  // A pre-picked date (shared link, or coming back to this step) shows its times right away.
  useEffect(() => {
    if (startDate) fetchSlots(startDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleDateSelect(isoDate: string) {
    setSelectedDate(isoDate)
    setSelectedTime(null)
    fetchSlots(isoDate)
    requestAnimationFrame(() =>
      document.getElementById('time-slots')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )
  }

  function handleTimeSelect(time: string) {
    setSelectedTime(time)
    if (selectedDate) {
      onChange(combineDateTime(selectedDate, time))
    }
  }

  return (
    <div>
      <p className="px-5 pt-1 pb-3 font-nunito font-extrabold text-[18px] text-text-primary">
        {t.booking.pickDateTime}
      </p>
      <div className="mx-5">
        <div className="flex items-center justify-between mb-3">
          <span className="font-nunito font-extrabold text-[18px] text-text-primary">
            {monthNames[month]} {year}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setViewingDate(new Date(year, month - 1, 1))}
              className="w-11 h-11 rounded-full bg-surface-secondary flex items-center justify-center hover:bg-border active:bg-border transition-colors"
              aria-label="Previous month"
            >
              <i className="ti ti-chevron-left text-[18px] text-text-secondary" aria-hidden="true" />
            </button>
            <button
              onClick={() => setViewingDate(new Date(year, month + 1, 1))}
              className="w-11 h-11 rounded-full bg-surface-secondary flex items-center justify-center hover:bg-border active:bg-border transition-colors"
              aria-label="Next month"
            >
              <i className="ti ti-chevron-right text-[18px] text-text-secondary" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 text-center mb-1.5">
          {t.dayAbbr.map((d: string) => (
            <span key={d} className="text-[12px] font-semibold text-text-muted py-1">{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
            const date = new Date(year, month, d)
            const todayCheck = new Date()
            todayCheck.setHours(0, 0, 0, 0)

            const isPast = date < todayCheck
            const isToday = todayDate === d
            const isoDate = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`

            const active = selectedDate === isoDate
            return (
              <button
                key={d}
                disabled={isPast || isToday}
                onClick={() => handleDateSelect(isoDate)}
                className={cn(
                  'aspect-square max-h-14 w-full mx-auto flex items-center justify-center text-[16px] font-semibold font-nunito rounded-full transition-colors',
                  isPast && 'text-border cursor-not-allowed',
                  isToday && 'text-brand cursor-not-allowed',
                  active && 'bg-brand text-white',
                  !isPast && !active && !isToday && 'text-text-primary hover:bg-surface-secondary active:bg-surface-secondary',
                )}
              >
                {d}
              </button>
            )
          })}
        </div>
      </div>

      {selectedDate && (
        <div id="time-slots" className="px-5 pt-5 scroll-mt-16">
          <p className="text-[13px] font-bold text-text-muted uppercase tracking-wide mb-2.5">
            {t.booking.availableTimes}
          </p>
          {loadingSlots ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[52px] border border-border rounded-[14px] bg-surface-secondary animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map(({ time, available }) => (
                <button
                  key={time}
                  disabled={!available}
                  onClick={() => available && handleTimeSelect(time)}
                  className={cn(
                    'h-[52px] border-[1.5px] rounded-[14px] text-[15px] font-semibold font-nunito transition active:scale-[0.97]',
                    !available && 'text-border bg-surface border-border cursor-not-allowed',
                    available && selectedTime !== time && 'text-text-primary bg-white border-border hover:border-brand',
                    selectedTime === time && 'bg-brand text-white border-brand',
                  )}
                >
                  {time}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Step 3 — Confirm ────────────────────────────────────────────────────────
function ConfirmStep({
  draft,
  selectedService,
  onChange,
  t,
  userDogs
}: {
  draft: BookingDraft
  selectedService: Service | null
  onChange: (fields: Partial<BookingDraft>) => void
  userDogs: { name: string; breed: string }[]
  t: any
}) {
  const [breedQuery, setBreedQuery] = useState(draft.breed ?? '')

  const [dogQuery, setDogQuery] = useState(draft.dogName ?? '')

  const filteredDogs = userDogs
    .filter((d) => d.name.toLowerCase().includes(dogQuery.toLowerCase()) && d.name !== dogQuery)
    .slice(0, 4)

  const filteredBreeds = DOG_BREEDS.filter((breed) =>
    breed.toLowerCase().includes(breedQuery.toLowerCase()),
  )
    .filter((breed) => breed !== breedQuery)
    .slice(0, 6)

  return (
    <div>
      <p className="px-5 pt-1 pb-1 font-nunito font-extrabold text-[18px] text-text-primary">
        {t.booking.confirmBooking}
      </p>
      <div className="mx-5 mt-3 bg-white rounded-[20px] border border-border overflow-hidden">
        {[
          { label: t.booking.service, value: selectedService?.name ?? '—' },
          { label: t.booking.date, value: formatDateTimeDisplay(draft.dateTime) },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-border last:border-none"
          >
            <span className="text-[14px] font-semibold text-text-muted">{label}</span>
            <span className="text-[15px] font-bold text-text-primary text-right">{value}</span>
          </div>
        ))}
        <div className="flex items-center justify-between px-5 py-3">
          <span className="text-[15px] font-bold text-text-primary">{t.booking.total}</span>
          <span className="font-nunito font-extrabold text-[18px] text-brand">
            ${selectedService?.price ?? '—'}
          </span>
        </div>
      </div>

     <div className="px-5 mt-4 relative">
  <label className="block text-[13px] font-bold text-text-primary uppercase tracking-wide mb-1.5">
    {t.booking.dogName}
  <span className='text-[11px] font-semibold normal-case tracking-normal text-brand mx-2'>*Required</span>
  </label>
  <input
    type="text"
    placeholder="e.g. Curi"
    value={dogQuery}
    autoComplete="off"
    autoCapitalize="words"
    enterKeyHint="next"
    onChange={(e) => {
      setDogQuery(e.target.value)
      onChange({ dogName: e.target.value, breed: e.target.value === '' ? '' : draft.breed })
    }}
    className="w-full px-4 py-3.5 border border-border rounded-[14px] text-base font-nunito-sans text-text-primary bg-white outline-none focus:border-brand"
  />
  {dogQuery.length > 0 && filteredDogs.length > 0 && (
    <div className="absolute left-5 right-5 mt-1 bg-white border border-border rounded-[14px] shadow-lg overflow-hidden z-20">
      {filteredDogs.map((dog) => (
        <button
          key={dog.name}
          type="button"
          onClick={() => {
            setDogQuery(dog.name)
            setBreedQuery(dog.breed ?? '')        // auto-fills the breed input
            onChange({ dogName: dog.name, breed: dog.breed ?? '' })
          }}
          className="w-full text-left px-4 py-3.5 text-base font-medium text-text-primary hover:bg-surface-secondary active:bg-surface-secondary transition-colors flex items-center justify-between"
          >
          <span>{dog.name}</span>
          {dog.breed && (
            <span className="text-[12px] text-text-muted">{dog.breed}</span>
          )}
        </button>
      ))}
    </div>
  )}
</div>
      <div className="px-5 mt-3">
        <label className="block text-[13px] font-bold text-text-primary uppercase tracking-wide mb-1.5">
          {t.booking.phone}
           <span className='text-[11px] font-semibold normal-case tracking-normal text-brand mx-2'>*Required</span>
        </label>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          enterKeyHint="next"
          placeholder="(123) 456-7890"
          value={draft.phone}
          onChange={(e) => onChange({ phone: e.target.value.replace(/[^\d+\-()\s]/g, '') })}
          className="w-full px-4 py-3.5 border border-border rounded-[14px] text-base font-nunito-sans text-text-primary bg-white outline-none focus:border-brand"
        />
      </div>

      <div className="px-5 mt-3">
        <label className="block text-[13px] font-bold text-text-secondary uppercase tracking-wide mb-1.5">
          KakaoId
        </label>
        <input
          type="text"
          placeholder="kakaoid"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={draft.kakaoid ?? ''}
          onChange={(e) => onChange({ kakaoid: e.target.value })}
          className="w-full px-4 py-3.5 border border-border rounded-[14px] text-base font-nunito-sans text-text-primary bg-white outline-none focus:border-brand"
        />
      </div>

      <div className="px-5 mt-3 relative">
     <BreedAutoComplete 
      breed={draft.breed}
      onChange={(e) => onChange({ breed: e })}
      t={t}
     />
     </div>


      <div className="px-5 mt-3 pb-2">
        <label className="block text-[13px] font-bold text-text-secondary uppercase tracking-wide mb-1.5">
          {t.booking.notesForGroomer}
        </label>
        <textarea
          rows={3}
          placeholder={t.booking.anySpecialRequests}
          value={draft.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          className="w-full px-4 py-3.5 border border-border rounded-[14px] text-base font-nunito-sans text-text-primary bg-white outline-none focus:border-brand resize-none"
        />
      </div>
    </div>
  )
}

// ─── Confirmation page ────────────────────────────────────────────────────────
function DetailRow({ icon, label, value }: { icon: string; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-none">
      <i className={`ti ${icon} text-[20px] text-text-muted flex-shrink-0`} aria-hidden="true" />
      <span className="text-[14px] font-semibold text-text-secondary">{label}</span>
      <span className={cn('ml-auto text-[15px] font-bold text-right truncate', value ? 'text-text-primary' : 'text-text-muted font-semibold')}>
        {value || '—'}
      </span>
    </div>
  )
}

function ConfirmationPage({
  draft,
  selectedService,
  onUpdate,
  language,
  t,
}: {
  draft: BookingDraft
  selectedService: Service | null
  onUpdate: (fields: Partial<BookingDraft>) => void
  language: string
  t: any
}) {
  const [editing, setEditing] = useState(false)
  const [dogName, setDogName] = useState(draft.dogName)
  const [breed, setBreed] = useState(draft.breed ?? '')
  const [phone, setPhone] = useState(draft.phone)
  const [kakaoid, setKakaoid] = useState(draft.kakaoid ?? '')
  const [notes, setNotes] = useState(draft.notes)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  const hasChanges =
    dogName.trim() !== draft.dogName.trim() ||
    breed.trim() !== (draft.breed ?? '').trim() ||
    phone.trim() !== draft.phone.trim() ||
    kakaoid.trim() !== (draft.kakaoid ?? '').trim() ||
    notes.trim() !== draft.notes.trim()
  const canSave = hasChanges && dogName.trim().length > 0 && phone.trim().length > 0 && !saving

  function openEditor() {
    setDogName(draft.dogName)
    setBreed(draft.breed ?? '')
    setPhone(draft.phone)
    setKakaoid(draft.kakaoid ?? '')
    setNotes(draft.notes)
    setSaveError(null)
    setJustSaved(false)
    setEditing(true)
  }

  // Close the sheet with Escape, like any other dialog.
  useEffect(() => {
    if (!editing) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setEditing(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editing])

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/bookings/${draft.bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dogName, breed, phone, kakaoid, notes }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSaveError(json.error ?? t.booking.somethingWentWrong)
        return
      }
      onUpdate({ dogName: dogName.trim(), breed: breed.trim(), phone: phone.trim(), kakaoid: kakaoid.trim(), notes: notes.trim() })
      setEditing(false)
      setJustSaved(true)
    } catch {
      setSaveError(t.booking.networkError)
    } finally {
      setSaving(false)
    }
  }

  // "Wed, Dec 2" + "10:00 AM", in the visitor's language.
  const { date, time } = splitDateTime(draft.dateTime)
  const when = date && time ? new Date(`${date}T${time}`) : null
  const locale = language === 'ko' ? 'ko-KR' : 'en-US'
  const dayLabel = when?.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })
  const timeLabel = when?.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })

  const fieldCls =
    'w-full px-4 py-3.5 border border-border rounded-[14px] text-base font-nunito-sans text-text-primary bg-white outline-none focus:border-brand'
  const labelCls = 'block text-[13px] font-bold text-text-secondary uppercase tracking-wide mb-1.5'

  return (
    <div className="app-shell flex flex-col min-h-full">
      <div className="flex-1 px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-4">
        {/* Header */}
        <div className="flex flex-col items-center text-center pt-2 pb-6">
          <div className="w-16 h-16 bg-brand-pale rounded-full flex items-center justify-center mb-3">
            <i className="ti ti-circle-check text-brand text-[34px]" aria-hidden="true" />
          </div>
          <h2 className="font-nunito font-extrabold text-[24px] text-text-primary">{t.booking.requestSent}</h2>
          <p className="text-[15px] text-text-secondary mt-1 max-w-[300px]">{t.booking.requestSentBody}</p>
        </div>

        {/* Appointment */}
        <div className="bg-white rounded-[20px] border border-border overflow-hidden">
          <div className="px-4 pt-4 pb-3.5">
            <span className="inline-flex items-center gap-1 text-[12px] font-bold text-amber-800 bg-amber-50 ring-1 ring-inset ring-amber-200 rounded-full px-2.5 py-1">
              <i className="ti ti-clock-hour-4 text-[13px]" aria-hidden="true" /> {t.booking.awaitingConfirmation}
            </span>
            <p className="font-nunito font-extrabold text-[22px] leading-tight text-text-primary mt-2.5">{dayLabel ?? '—'}</p>
            <p className="font-nunito font-bold text-[17px] text-text-secondary">{timeLabel}</p>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-t border-border bg-surface/60">
            <span className="flex items-center gap-2 min-w-0">
              <i className={`ti ${selectedService?.icon ?? 'ti-scissors'} text-[20px] text-brand-light`} aria-hidden="true" />
              <span className="text-[15px] font-bold text-text-primary truncate">{selectedService?.name ?? '—'}</span>
            </span>
            <span className="font-nunito font-extrabold text-[18px] text-brand">${selectedService?.price ?? '—'}</span>
          </div>
        </div>
        <p className="text-[13px] text-text-muted mt-2 px-1 flex items-start gap-1.5">
          <i className="ti ti-message-circle text-[16px] mt-px" aria-hidden="true" />
          {t.booking.changeTimeNote}
        </p>

        {/* Details */}
        <div className="flex items-center justify-between mt-6 mb-2 px-1">
          <h3 className="font-nunito font-extrabold text-[17px] text-text-primary">{t.booking.yourDetails}</h3>
          {justSaved ? (
            <span className="inline-flex items-center gap-1 text-[14px] font-bold text-green-700">
              <i className="ti ti-check" aria-hidden="true" /> {t.booking.saved}
            </span>
          ) : null}
        </div>
        <div className="bg-white rounded-[20px] border border-border overflow-hidden">
          <DetailRow icon="ti-dog" label={t.booking.dog} value={draft.dogName} />
          <DetailRow icon="ti-paw" label={t.booking.dogBreed} value={draft.breed} />
          <DetailRow icon="ti-phone" label={t.booking.phone} value={draft.phone} />
          <DetailRow icon="ti-message-circle" label="KakaoTalk" value={draft.kakaoid} />
          {draft.notes?.trim() && (
            <div className="px-4 py-3.5 border-t border-border">
              <p className="text-[14px] font-semibold text-text-secondary mb-1">{t.booking.notesForGroomer}</p>
              <p className="text-[15px] text-text-primary whitespace-pre-wrap">{draft.notes}</p>
            </div>
          )}
          <button
            type="button"
            onClick={openEditor}
            className="w-full flex items-center justify-center gap-1.5 min-h-[52px] border-t border-border text-[15px] font-bold font-nunito text-brand active:bg-brand-muted transition-colors"
          >
            <i className="ti ti-pencil text-[18px]" aria-hidden="true" /> {t.booking.editDetails}
          </button>
        </div>
      </div>

      {/* Done */}
      <div data-bottom-bar className="sticky bottom-0 z-30 px-5 pt-3 pb-safe bg-surface/95 backdrop-blur border-t border-border">
        <Link
          href="/"
          className="w-full bg-brand text-white font-nunito font-bold text-[17px] rounded-full py-[18px] flex items-center justify-center transition active:scale-[0.98]"
        >
          {t.booking.done}
        </Link>
      </div>

      {/* Edit sheet */}
      {editing && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={t.booking.editDetails}>
          <div className="absolute inset-0 bg-black/40" onClick={() => !saving && setEditing(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[92dvh] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[440px] md:max-h-[85dvh] rounded-t-3xl md:rounded-3xl bg-white shadow-2xl flex flex-col">
            <div className="md:hidden flex justify-center pt-2">
              <span className="w-10 h-1.5 rounded-full bg-gray-200" />
            </div>
            <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-3 border-b border-border">
              <h2 className="font-nunito font-extrabold text-[19px] text-text-primary">{t.booking.editDetails}</h2>
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={saving}
                className="w-11 h-11 -mr-2 rounded-full flex items-center justify-center text-text-secondary active:bg-surface-secondary"
                aria-label={t.booking.cancel}
              >
                <i className="ti ti-x text-[22px]" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
              <div>
                <label htmlFor="edit-dog" className={labelCls}>{t.booking.dogName}</label>
                <input id="edit-dog" value={dogName} onChange={(e) => setDogName(e.target.value)}
                  autoComplete="off" autoCapitalize="words" enterKeyHint="next" className={fieldCls} />
              </div>
              <div className="relative">
                <BreedAutoComplete breed={breed} onChange={setBreed} t={t} />
              </div>
              <div>
                <label htmlFor="edit-phone" className={labelCls}>{t.booking.phone}</label>
                <input id="edit-phone" type="tel" inputMode="tel" autoComplete="tel" enterKeyHint="next"
                  value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+\-()\s]/g, ''))} className={fieldCls} />
              </div>
              <div>
                <label htmlFor="edit-kakao" className={labelCls}>KakaoTalk ID</label>
                <input id="edit-kakao" value={kakaoid} onChange={(e) => setKakaoid(e.target.value)}
                  autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} className={fieldCls} />
              </div>
              <div>
                <label htmlFor="edit-notes" className={labelCls}>{t.booking.notesForGroomer}</label>
                <textarea id="edit-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder={t.booking.anySpecialRequests} className={`${fieldCls} resize-none`} />
              </div>
            </div>

            <div className="border-t border-border px-5 pt-3 pb-safe">
              {saveError && <p className="text-[13px] text-red-500 text-center mb-2" role="alert">{saveError}</p>}
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className="w-full bg-brand text-white font-nunito font-bold text-[17px] rounded-full py-[16px] disabled:opacity-40 transition active:scale-[0.98]"
              >
                {saving ? '…' : t.booking.saveChanges}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Account creation page ────────────────────────────────────────────────────
function AccountCreationPage({
  draft,
  onComplete,
}: {
  draft: BookingDraft
  onComplete: () => void
}) {
const [password, setPassword] = useState('')
const [confirmPassword, setConfirmPassword] = useState('')
const { language } = useLanguage()
const t = translations[language]

  const canCreate =
    draft.email && password && password === confirmPassword && password.length >= 6

const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

const handleCreateAccount = async () => {
  setLoading(true)
  setError(null)

  try {
    const res = await fetch('/api/account', {
      method: 'POST',
      body: JSON.stringify({
        email: draft.email,
        password,
        phone: draft.phone,
        dogName: draft.dogName,
        breed: draft.breed,
        bookingId: draft.bookingId,
      }),
    })

    if (!res.ok) {
      const json = await res.json()
      setError(json.error ?? 'Something went wrong')
      return
    }

    onComplete()

  } catch (err) {
    setError('Network error, please try again')
  } finally {
    setLoading(false)
  }
}

  return (
    <div className="flex flex-col px-5 py-8">
      <h2 className="font-nunito font-extrabold text-2xl text-text-primary mb-2">
        {t.booking.createYourAccount}
      </h2>
      <p className="text-text-secondary text-[14px] mb-6">{t.booking.saveBookings}</p>

      <div className="mb-4">
        <label className="block text-[13px] font-bold text-text-secondary uppercase tracking-wide mb-1.5">
          {t.booking.email}
        </label>
        <input
          type="email"
          value={draft.email}
          disabled
          className="w-full px-4 py-3.5 border border-border rounded-[14px] text-base font-nunito-sans text-text-muted bg-surface outline-none cursor-not-allowed"
        />
        <p className="text-[11px] text-text-muted mt-1">{t.booking.usesBookingEmail}</p>
      </div>

      <div className="mb-4">
        <label className="block text-[13px] font-bold text-text-secondary uppercase tracking-wide mb-1.5">
          {t.booking.password}
        </label>
        <input
          type="password"
          placeholder={t.booking.atLeast6Chars}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3.5 border border-border rounded-[14px] text-base font-nunito-sans text-text-primary bg-white outline-none focus:border-brand"
        />
      </div>

      <div className="mb-6">
        <label className="block text-[13px] font-bold text-text-secondary uppercase tracking-wide mb-1.5">
          {t.booking.confirmPassword}
        </label>
        <input
          type="password"
          placeholder={t.booking.confirmPassword}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-4 py-3.5 border border-border rounded-[14px] text-base font-nunito-sans text-text-primary bg-white outline-none focus:border-brand"
        />
        {password && confirmPassword && password !== confirmPassword && (
          <p className="text-[11px] text-red-500 mt-1">{t.booking.passwordsDontMatch}</p>
        )}
      </div>
  
        {error && (
            <p className="text-red-500 text-sm mt-2">
              {error}
            </p>
          )}

      <button
        disabled={!canCreate || loading}
        onClick={handleCreateAccount}
        className="w-full bg-brand text-white font-nunito font-bold text-base rounded-full py-4 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity active:opacity-80 mb-3"
      >
        {t.booking.createAccount}
      </button>

      <Link
        href="/"
        className="w-full bg-white text-brand font-nunito font-bold text-base rounded-full py-4 border-2 border-brand flex items-center justify-center transition-opacity active:opacity-80"
      >
        {t.booking.skipForNow}
      </Link>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function BookPage() {
  return (
    <Suspense fallback={null}>
      <BookPageContent />
    </Suspense>
  )
}

function BookPageContent() {
  const searchParams = useSearchParams()
  const dogSizeParam = searchParams.get('size')
  const dogNameParam = searchParams.get('dogName')
  const breedParam = searchParams.get('breed') // optional
  // Links the groomer shares from admin (e.g. in KakaoTalk) can pre-pick the rest:
  // /book?dogName=Curi&size=M&service=3&date=2026-11-26&time=10:00&kakao=curimom
  const serviceParam = Number(searchParams.get('service')) || null
  const dateParam = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.get('date') ?? '') ? searchParams.get('date') : null
  const timeParam = /^\d{2}:\d{2}$/.test(searchParams.get('time') ?? '') ? searchParams.get('time') : null
  const kakaoParam = searchParams.get('kakao')
  const linkDateTime = dateParam && timeParam ? `${dateParam}T${timeParam}:00` : null
  const fromLink = serviceParam !== null

  const { language, setLanguage } = useLanguage()
  const t = translations[language]
  const [step, setStep] = useState<Step>(1)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)
  const [userDogs, setUserDogs] = useState<{ name: string; breed: string }[]>([])
  const [draft, setDraft] = useState<BookingDraft>({
    serviceId: serviceParam,
    dateTime: linkDateTime,
    dogName: dogNameParam ?? '',
    email: '',
    phone: '',
    notes: '',
    breed: breedParam ?? null,
    bookingId: null,
    user_id: null,
    dogSize: dogSizeParam,
    kakaoid: kakaoParam ?? ''
  })
  const [draftHydrated, setDraftHydrated] = useState(false)
  const { services } = useServices(language, draft.dogSize)

  useEffect(() => {
    try {
      const storedDraft = sessionStorage.getItem(BOOKING_DRAFT_STORAGE_KEY)
      // A shared link wins over a half-finished draft from an earlier visit.
      if (fromLink) {
        sessionStorage.removeItem(BOOKING_DRAFT_STORAGE_KEY)
      } else if (storedDraft) {
        setDraft((prev) => ({ ...prev, ...JSON.parse(storedDraft) }))
      }
    } catch (error) {
      console.warn('Could not restore booking draft:', error)
    } finally {
      setDraftHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!draftHydrated || isConfirmed) return

    try {
      sessionStorage.setItem(BOOKING_DRAFT_STORAGE_KEY, JSON.stringify(draft))
    } catch (error) {
      console.warn('Could not persist booking draft:', error)
    }
  }, [draft, draftHydrated, isConfirmed])

useEffect(() => {
  async function loadUserData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: dogs }] = await Promise.all([
      supabase.from('dogs').select('name, breed').eq('user_id', user.id),
    ])

    setUserDogs(dogs ?? [])

    setDraft((prev) => ({
      ...prev,
      email: prev.email || user.email || '',
      phone: prev.phone || user.phone || '',
    }))

  }
  
  loadUserData()
}, [])

const updateDraft = (fields: Partial<BookingDraft>) =>
  setDraft((prev) => ({ ...prev, ...fields }))

const linkHandled = useRef(false)
useEffect(() => {
  if (!fromLink || linkHandled.current || services.length === 0) return
  linkHandled.current = true

  const linked = services.find((s) => s.id === serviceParam)
  if (!linked) {
    // Unknown service id: start from service selection as normal.
    updateDraft({ serviceId: null, dateTime: null })
    return
  }
  if (!linkDateTime || !dateParam) {
    setStep(2)
    return
  }

  fetch(`/api/availability?date=${dateParam}&slots=${linked.slots ?? 1}`)
    .then((res) => res.json())
    .then((json) => {
      const label = to12HourLabel(`${timeParam}:00`)
      const free = (json.slots ?? []).some(
        (s: { time: string; available: boolean }) => s.time === label && s.available,
      )
      if (free) {
        setStep(3)
      } else {
        updateDraft({ dateTime: null })
        setSubmitError(t.booking.linkedTimeTaken ?? 'That time was just taken. Please pick another time.')
        setStep(2)
      }
    })
    .catch(() => setStep(2))
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [services])

function handleServiceSelect(service: Service) {
  updateDraft({ serviceId: service.id, dateTime: null })
}

  const selectedService = services.find((s) => s.id === draft.serviceId) ?? null

  const canContinue =
  (step === 1 && draft.serviceId !== null) ||
  (step === 2 && draft.dateTime !== null) ||
  (step === 3 &&
    !!draft.dogName &&
    // !!draft.email &&
    !!draft.phone)

const [isSubmitting, setIsSubmitting] = useState(false)
const [submitError, setSubmitError] = useState<string | null>(null)

async function handleContinue() {

if (isSubmitting) return
const { data: { session } } = await supabase.auth.getSession()
const user = session?.user

  if (step < 3) {
    setStep((s) => (s + 1) as Step)
  } else if (step === 3) {
    setIsSubmitting(true)
    setSubmitError(null)

    const payload = {
      service_id:     draft.serviceId,
      service_price:  selectedService?.price,
      duration_slots: selectedService?.slots,
      date_time:      draft.dateTime,
      dog_name:       draft.dogName,
      breed:          draft.breed,
      email:          draft.email,
      phone:          draft.phone,
      notes:          draft.notes,
      bookingId:      draft.bookingId,
      user_id:       user ? user.id : null,
      kakaoid:        draft.kakaoid
    }

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (res.status === 409) {
        // slot was taken between selecting and confirming
        console.log(json.error)
        setSubmitError("The selected time slot is no longer available. Please choose a different time.")
        setStep(2)
        return
      }

      if (!res.ok) {
        setSubmitError(json.error ?? 'Something went wrong')
        return
      }

      sessionStorage.removeItem(BOOKING_DRAFT_STORAGE_KEY)

      setDraft((prev) => ({
        ...prev,
        bookingId: json.booking.id,
      }))


      // The admin "new booking" email is sent server-side by POST /api/bookings.

      // After the booking succeeds, before setIsConfirmed(true)
if (user) {  
  // Check if this dog is already saved for this user
  const alreadySaved = userDogs.some(
    (d) => d.name.toLowerCase() === draft.dogName.toLowerCase()
  )

  if (!alreadySaved && draft.dogName) {

    const res = await fetch('/api/dogs', {
      method: 'POST',
      body: JSON.stringify({
      user_id: user.id,
      name: draft.dogName,
      breed: draft.breed ?? null,
    })
    })

    if (!res.ok) {
      const json = await res.json()
      return
    }

    // // Keep local state in sync so it shows up if they book again in the same session
    // setUserDogs((prev) => [...prev, { name: draft.dogName, breed: draft.breed ?? '' }])
  }
}
    setIsConfirmed(true)
      } catch (err) {
        setSubmitError('Network error, please try again')
      } finally {
        setIsSubmitting(false)
      }
    }
}

useEffect(() => {
  document.getElementById('app-scroll')?.scrollTo({ top: 0 })
}, [step, isConfirmed, isCreatingAccount])

  function handleBack() {
    if (step > 1) {
      setStep((s) => (s - 1) as Step)
    }
  }

  const backButtonClass =
    'w-11 h-11 rounded-full bg-surface-secondary flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform'

  // Phones only: the site TopBar is hidden on /book, so this header carries the language switch.
  const languageToggle = (
    <button
      type="button"
      onClick={() => setLanguage(language === 'en' ? 'ko' : 'en')}
      aria-label={language === 'en' ? 'Switch to Korean' : 'Switch to English'}
      className="md:hidden ml-auto h-11 min-w-11 px-3 rounded-full bg-surface-secondary text-[14px] font-bold text-text-secondary flex-shrink-0 active:scale-95 transition-transform"
    >
      {language === 'en' ? 'EN' : '한'}
    </button>
  )

  if (isCreatingAccount) {
    return (
      <div>
        <div className="pt-safe flex items-center gap-3 px-5 pb-3 md:pt-0 border-b border-border">
          <button
            onClick={() => setIsCreatingAccount(false)}
            className={backButtonClass}
            aria-label="Back"
          >
            <i className="ti ti-arrow-left text-[20px] text-text-secondary" aria-hidden="true" />
          </button>
          <span className="truncate font-nunito font-extrabold text-xl text-text-primary">
            {t.booking.createYourAccount}
          </span>
          {languageToggle}
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">

            <AccountCreationPage
            draft={draft}
            onComplete={() => {
              setTimeout(() => {
                window.location.href = '/login'
              }, 500)
            }}
            />

        </div>
      </div>
    )
  }

  if (isConfirmed) {
    return (
      <div>
        <ConfirmationPage
          draft={draft}
          selectedService={selectedService}
          onUpdate={(fields) => updateDraft(fields)}
          language={language}
          t={t}
        />
      </div>
    )
  }

  return (
    <div className='app-shell flex flex-col min-h-full'>
      <div className="sticky top-0 z-30 bg-surface pt-safe pb-2 md:pt-1 flex items-center gap-3 px-5">
        {step === 1 ? (
          <Link href="/" className={backButtonClass} aria-label="Back">
            <i className="ti ti-arrow-left text-[20px] text-text-secondary" aria-hidden="true" />
          </Link>
        ) : (
          <button type="button" onClick={handleBack} className={backButtonClass} aria-label="Back">
            <i className="ti ti-arrow-left text-[20px] text-text-secondary" aria-hidden="true" />
          </button>
        )}
        <span className="truncate font-nunito font-extrabold text-xl text-text-primary">
          {t.booking.bookASession}
        </span>
        {languageToggle}
      </div>

      <StepIndicator current={step} total={3} />

      <div className="flex-1 pb-4">
         {submitError && (
          <div className="mx-5 mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-[14px] flex items-start gap-2">
            <i className="ti ti-alert-circle text-red-500 text-[16px] mt-0.5 flex-shrink-0" aria-hidden="true" />
            <p className="text-[13px] font-semibold text-red-600">{submitError}</p>
          </div>
        )}
        {step === 1 && (
          <ServiceStep
            selectedServiceId={draft.serviceId}
            onSelect={(s) => handleServiceSelect(s)}
            language={language}
            t={t}
            services={services}
          />
        )}
        {step === 2 && (
          <DateTimeStep
            value={draft.dateTime}
            onChange={(dateTime) => updateDraft({ dateTime })}
            selectedService={selectedService}
            language={language}
            t={t}
            focusDate={dateParam}
          />
        )}
        {step === 3 && (
          <ConfirmStep
            draft={draft}
            selectedService={selectedService}
            onChange={updateDraft}
            userDogs={userDogs}
            t={t}
          />
        )}
      </div>

      <div data-bottom-bar className="sticky bottom-0 z-30 px-5 pt-3 pb-safe bg-surface/95 backdrop-blur border-t border-border">
        {selectedService && (
          <div className="flex items-center justify-between pb-2.5 text-[14px]">
            <span className="truncate font-semibold text-text-secondary">
              {selectedService.name}
              {draft.dateTime && step > 2 ? ` · ${formatDateTimeDisplay(draft.dateTime)}` : ''}
            </span>
            <span className="ml-3 font-nunito font-extrabold text-[17px] text-brand">${selectedService.price}</span>
          </div>
        )}
        <button
          disabled={!canContinue || isSubmitting}
          onClick={handleContinue}
          className="w-full bg-brand text-white font-nunito font-bold text-[17px] rounded-full py-[18px] shadow-[0_10px_24px_-12px_rgba(255,107,26,0.7)] disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed transition active:scale-[0.98]"
        >
          {isSubmitting ? '…' : step === 3 ? t.booking.confirmBookingBtn : t.booking.continue}
        </button>
      </div>
    </div>
  )
}