'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Booking, Service } from '@/types'
import { addDaysKey, dayHeading } from './lib'
import { Field, Sheet, btn, inputCls } from './ui'

export type NewBookingMode = 'add' | 'link'

type Slot = { time: string; available: boolean }
type Customer = { dog_name: string; breed: string | null; kakaoid: string; phone: string; email: string }

const SIZES = [
  { value: 'S', label: 'S', hint: '0–25 lb' },
  { value: 'M', label: 'M', hint: '25–60 lb' },
  { value: 'L', label: 'L', hint: '60+ lb' },
] as const

// "10:00 AM" -> "10:00"
function to24(label: string): string {
  const [time, mer] = label.split(' ')
  let [h, m] = time.split(':').map(Number)
  if (mer === 'PM' && h !== 12) h += 12
  if (mer === 'AM' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** One entry per dog (by Kakao ID or phone + dog name), most recent details first. */
function pastCustomers(bookings: Booking[]): Customer[] {
  const seen = new Map<string, Customer>()
  for (const b of [...bookings].sort((a, z) => z.date_time.localeCompare(a.date_time))) {
    const key = `${(b.kakaoid || b.phone || '').toLowerCase()}|${b.dog_name.toLowerCase()}`
    if (!seen.has(key)) {
      seen.set(key, {
        dog_name: b.dog_name,
        breed: b.breed,
        kakaoid: b.kakaoid ?? '',
        phone: b.phone ?? '',
        email: b.email ?? '',
      })
    }
  }
  return [...seen.values()]
}

export default function NewBookingSheet({ open, initialMode = 'add', appointments, services, todayKey, onClose, onCreated }: {
  open: boolean
  initialMode?: NewBookingMode
  appointments: Booking[]
  services: Service[]
  todayKey: string
  onClose: () => void
  onCreated: (booking: Booking) => void
}) {
  const [mode, setMode] = useState<NewBookingMode>(initialMode)
  const [serviceId, setServiceId] = useState<number | null>(null)
  const [size, setSize] = useState<string>('')
  const [date, setDate] = useState(todayKey)
  const [time, setTime] = useState<string | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [dogName, setDogName] = useState('')
  const [kakaoid, setKakaoid] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [breed, setBreed] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<'link' | 'message' | null>(null)
  const [msgLang, setMsgLang] = useState<'ko' | 'en'>('ko')

  // Fresh form every time the sheet opens.
  useEffect(() => {
    if (!open) return
    setMode(initialMode)
    setServiceId(null); setSize(''); setTime(null)
    setDate(initialMode === 'link' ? addDaysKey(todayKey, 1) : todayKey)
    setDogName(''); setKakaoid(''); setPhone(''); setEmail(''); setBreed(''); setNotes('')
    setError(null); setCopied(null)
  }, [open, initialMode, todayKey])

  // Customers can't book same-day on the site, so links start tomorrow.
  const minDate = mode === 'link' ? addDaysKey(todayKey, 1) : todayKey
  useEffect(() => {
    if (date < minDate) setDate(minDate)
  }, [minDate, date])

  const service = services.find(s => s.id === serviceId) ?? null
  const sortedServices = useMemo(() => [...services].sort((a, b) => a.order - b.order), [services])

  // Free times for the chosen day and service length.
  useEffect(() => {
    if (!open || !date) return
    let cancelled = false
    setSlotsLoading(true)
    setTime(null)
    fetch(`/api/admin/availability?date=${date}&slots=${service?.slots ?? 1}`)
      .then(r => r.json())
      .then(j => { if (!cancelled) setSlots(j.slots ?? []) })
      .catch(() => { if (!cancelled) setSlots([]) })
      .finally(() => { if (!cancelled) setSlotsLoading(false) })
    return () => { cancelled = true }
  }, [open, date, service?.slots])

  // Returning customers: match on dog name, Kakao ID or phone.
  const customers = useMemo(() => pastCustomers(appointments), [appointments])
  const query = (dogName || kakaoid).trim().toLowerCase()
  const matches = query.length < 2 ? [] : customers.filter(c =>
    c.dog_name.toLowerCase().includes(query) ||
    c.kakaoid.toLowerCase().includes(query) ||
    c.phone.replace(/\D/g, '').includes(query.replace(/\D/g, '') || '\u0000'),
  ).filter(c => !(c.dog_name === dogName && c.kakaoid === kakaoid)).slice(0, 4)

  function fillCustomer(c: Customer) {
    setDogName(c.dog_name)
    setKakaoid(c.kakaoid)
    setPhone(c.phone)
    setEmail(c.email)
    setBreed(c.breed ?? '')
  }

  // ─── Add ───
  const canSave = !!service && !!time && dogName.trim().length > 0 && !saving

  async function save() {
    if (!service || !time) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: service.id,
          date_time: `${date}T${to24(time)}:00`,
          dog_name: dogName, kakaoid, phone, email, breed, notes,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Could not save the booking')
      onCreated(json.booking)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      // the slot may have just been taken: refresh the times
      if (date) fetch(`/api/admin/availability?date=${date}&slots=${service.slots ?? 1}`).then(r => r.json()).then(j => setSlots(j.slots ?? [])).catch(() => {})
    } finally {
      setSaving(false)
    }
  }

  // ─── Link ───
  const link = useMemo(() => {
    if (typeof window === 'undefined') return ''
    const p = new URLSearchParams()
    if (dogName.trim()) p.set('dogName', dogName.trim())
    if (size) p.set('size', size)
    if (breed.trim()) p.set('breed', breed.trim())
    if (service) p.set('service', String(service.id))
    if (service && date && time) { p.set('date', date); p.set('time', to24(time)) }
    if (kakaoid.trim()) p.set('kakao', kakaoid.trim())
    return `${window.location.origin}/book?${p.toString()}`
  }, [dogName, size, breed, service, date, time, kakaoid])

  // Real dates, not "Tomorrow": the customer may read it a day later.
  const whenText = (() => {
    if (!time) return ''
    const [y, m, d] = date.split('-').map(Number)
    if (msgLang === 'ko') {
      const [hm, mer] = time.split(' ')
      return `${m}월 ${d}일 ${mer === 'AM' ? '오전' : '오후'} ${hm}`
    }
    const day = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' })
    return `${day} at ${time}`
  })()
  const message = msgLang === 'ko'
    ? `안녕하세요! 멍멍 그루밍입니다 🐶\n${dogName.trim() ? `${dogName.trim()} ` : ''}예약은 아래 링크에서 완료해 주세요${whenText ? ` (${whenText})` : ''}.\n${link}`
    : `Hi from Mung Mung Grooming! 🐶\nYou can finish ${dogName.trim() ? `${dogName.trim()}'s ` : 'your '}booking here${whenText ? ` (${whenText})` : ''}:\n${link}`

  const canShare = !!service && !!size

  async function copy(what: 'link' | 'message') {
    try {
      await navigator.clipboard.writeText(what === 'link' ? link : message)
      setCopied(what)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      setError('Could not copy. Press and hold the link to copy it instead.')
    }
  }

  async function share() {
    if (navigator.share) {
      try { await navigator.share({ text: message }) } catch { /* user closed the share sheet */ }
    } else {
      copy('message')
    }
  }

  const footer = mode === 'add' ? (
    <>
      {error && <p className="text-xs text-red-500 text-center mb-2" role="alert">{error}</p>}
      <button onClick={save} disabled={!canSave} className={`${btn.primary} w-full`}>
        <i className="ti ti-check" aria-hidden="true" />
        {saving ? 'Saving…' : time ? `Book ${dayHeading(date, todayKey)} at ${time}` : 'Pick a time'}
      </button>
    </>
  ) : (
    <>
      {error && <p className="text-xs text-red-500 text-center mb-2" role="alert">{error}</p>}
      <div className="flex gap-2">
        <button onClick={share} disabled={!canShare} className={`${btn.primary} flex-1`}>
          <i className="ti ti-share" aria-hidden="true" /> Share message
        </button>
        <button onClick={() => copy('link')} disabled={!canShare} className={`${btn.secondary} flex-1`}>
          <i className={`ti ${copied === 'link' ? 'ti-check' : 'ti-link'}`} aria-hidden="true" />
          {copied === 'link' ? 'Copied' : 'Copy link'}
        </button>
      </div>
    </>
  )

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={mode === 'add' ? 'New booking' : 'Send a booking link'}
      subtitle={mode === 'add' ? 'For bookings made in KakaoTalk or by phone' : 'The customer confirms it themselves'}
      footer={footer}
    >
      {/* Mode switch */}
      <div className="grid grid-cols-2 gap-1 p-1 mb-4 bg-surface-secondary rounded-full" role="tablist">
        {([['add', 'ti-calendar-plus', 'Add booking'], ['link', 'ti-link', 'Send link']] as const).map(([m, icon, label]) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => { setMode(m); setError(null) }}
            className={`min-h-10 rounded-full text-sm font-bold font-nunito inline-flex items-center justify-center gap-1.5 transition-colors ${
              mode === m ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary'
            }`}
          >
            <i className={`ti ${icon}`} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {/* Who */}
        <div className="relative">
          <Field label="Dog's name" hint={mode === 'add' ? 'Start typing to fill in a returning customer' : undefined}>
            <input
              className={inputCls}
              value={dogName}
              onChange={e => setDogName(e.target.value)}
              placeholder="Curi"
              autoComplete="off"
              autoCapitalize="words"
            />
          </Field>
          {matches.length > 0 && (
            <div className="mt-1.5 rounded-xl border border-border bg-white overflow-hidden">
              {matches.map(c => (
                <button
                  key={`${c.kakaoid}|${c.phone}|${c.dog_name}`}
                  type="button"
                  onClick={() => fillCustomer(c)}
                  className="w-full flex items-center justify-between gap-3 px-3 min-h-11 text-left hover:bg-surface active:bg-surface-secondary border-b border-border last:border-0"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-bold font-nunito text-text-primary truncate">{c.dog_name}</span>
                    <span className="block text-[11px] text-text-secondary truncate">
                      {[c.breed, c.kakaoid && `Kakao ${c.kakaoid}`, c.phone].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="text-[11px] font-bold text-brand flex-shrink-0">Use</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <Field label="KakaoTalk ID">
          <input
            className={inputCls}
            value={kakaoid}
            onChange={e => setKakaoid(e.target.value)}
            placeholder="curimom"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </Field>

        {mode === 'link' && (
          <div>
            <span className="block text-[11px] font-bold font-nunito text-text-secondary uppercase tracking-wide mb-1">Size</span>
            <div className="grid grid-cols-3 gap-2">
              {SIZES.map(s => (
                <button
                  key={s.value}
                  type="button"
                  aria-pressed={size === s.value}
                  onClick={() => setSize(s.value)}
                  className={`min-h-11 rounded-xl border text-sm font-bold font-nunito transition-colors ${
                    size === s.value ? 'bg-brand border-brand text-white' : 'bg-white border-border text-text-primary'
                  }`}
                >
                  {s.label} <span className={`text-[11px] font-semibold ${size === s.value ? 'text-white/80' : 'text-text-muted'}`}>{s.hint}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* What */}
        <div>
          <span className="block text-[11px] font-bold font-nunito text-text-secondary uppercase tracking-wide mb-1">Service</span>
          <div className="flex flex-wrap gap-2">
            {sortedServices.map(s => (
              <button
                key={s.id}
                type="button"
                aria-pressed={serviceId === s.id}
                onClick={() => setServiceId(s.id)}
                className={`min-h-10 px-3.5 rounded-full border text-sm font-bold font-nunito transition-colors ${
                  serviceId === s.id ? 'bg-brand border-brand text-white' : 'bg-white border-border text-text-primary'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* When */}
        <div>
          <div className="flex items-end justify-between gap-2 mb-1">
            <span className="block text-[11px] font-bold font-nunito text-text-secondary uppercase tracking-wide">
              {mode === 'link' ? 'Time (optional)' : 'Date and time'}
            </span>
            <span className="text-[11px] text-text-muted">{dayHeading(date, todayKey)}</span>
          </div>
          <div className="flex gap-2 mb-2">
            <button type="button" onClick={() => date > minDate && setDate(addDaysKey(date, -1))} disabled={date <= minDate} className={`${btn.secondary} px-3`} aria-label="Previous day">
              <i className="ti ti-chevron-left" aria-hidden="true" />
            </button>
            <input type="date" className={`${inputCls} flex-1`} value={date} min={minDate} onChange={e => e.target.value && setDate(e.target.value)} />
            <button type="button" onClick={() => setDate(addDaysKey(date, 1))} className={`${btn.secondary} px-3`} aria-label="Next day">
              <i className="ti ti-chevron-right" aria-hidden="true" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {(slotsLoading ? Array.from({ length: 8 }, () => null) : slots).map((s, i) =>
              s === null ? (
                <div key={i} className="h-10 rounded-xl bg-surface-secondary animate-pulse" />
              ) : (
                <button
                  key={s.time}
                  type="button"
                  disabled={!s.available}
                  aria-pressed={time === s.time}
                  onClick={() => setTime(time === s.time && mode === 'link' ? null : s.time)}
                  className={`h-10 rounded-xl border text-[13px] font-bold font-nunito transition-colors ${
                    time === s.time
                      ? 'bg-brand border-brand text-white'
                      : s.available
                        ? 'bg-white border-border text-text-primary hover:border-brand'
                        : 'bg-surface border-border text-text-muted line-through cursor-not-allowed'
                  }`}
                >
                  {s.time.replace(':00', '')}
                </button>
              ),
            )}
          </div>
          {!service && <p className="text-[11px] text-text-muted mt-1.5">Pick a service to see times that fit its length.</p>}
        </div>

        {mode === 'add' ? (
          <details className="group rounded-xl border border-border">
            <summary className="list-none cursor-pointer min-h-11 px-3 flex items-center justify-between text-sm font-bold font-nunito text-text-secondary">
              Phone, breed, notes <span className="text-[11px] font-semibold text-text-muted">optional</span>
              <i className="ti ti-chevron-down transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="px-3 pb-3 space-y-3">
              <Field label="Phone">
                <input className={inputCls} type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(403) 555-0123" />
              </Field>
              <Field label="Breed">
                <input className={inputCls} value={breed} onChange={e => setBreed(e.target.value)} placeholder="Maltipoo" autoCapitalize="words" />
              </Field>
              <Field label="Notes">
                <textarea className={`${inputCls} resize-none`} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Matting behind ears" />
              </Field>
            </div>
          </details>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="block text-[11px] font-bold font-nunito text-text-secondary uppercase tracking-wide">Message preview</span>
              <div className="flex gap-1">
                {(['ko', 'en'] as const).map(l => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setMsgLang(l)}
                    aria-pressed={msgLang === l}
                    className={`h-7 px-2.5 rounded-full text-[11px] font-bold ${msgLang === l ? 'bg-text-primary text-white' : 'bg-surface-secondary text-text-secondary'}`}
                  >
                    {l === 'ko' ? '한국어' : 'English'}
                  </button>
                ))}
              </div>
            </div>
            {canShare ? (
              <button
                type="button"
                onClick={() => copy('message')}
                className="w-full text-left rounded-xl bg-surface p-3 text-[13px] leading-relaxed text-text-primary whitespace-pre-wrap break-all border border-border"
              >
                {message}
                <span className="block mt-2 text-[11px] font-bold text-brand">
                  {copied === 'message' ? 'Message copied' : 'Tap to copy message'}
                </span>
              </button>
            ) : (
              <p className="rounded-xl bg-surface p-3 text-[13px] text-text-secondary border border-border">
                Pick a size and service to make the link.
              </p>
            )}
          </div>
        )}
      </div>
    </Sheet>
  )
}
