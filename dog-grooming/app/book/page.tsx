'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { SERVICES, TIME_SLOTS } from '@/lib/data'
import type { BookingDraft, Service } from '@/types'
import BottomNav from '@/components/layout/BottomNav'

type Step = 1 | 2 | 3

// ─── Step indicator ──────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center px-5 py-3.5">
      {([1, 2, 3] as Step[]).map((n, i) => (
        <div key={n} className="flex items-center flex-1 last:flex-none">
          <div
            className={cn(
              'w-[30px] h-[30px] rounded-full flex items-center justify-center text-[13px] font-bold font-nunito flex-shrink-0',
              n < current  && 'bg-brand text-white',
              n === current && 'bg-text-primary text-white',
              n > current  && 'bg-surface-secondary text-text-muted',
            )}
          >
            {n < current ? (
              <i className="ti ti-check text-[12px]" aria-hidden="true" />
            ) : n}
          </div>
          {i < 2 && (
            <div
              className={cn('flex-1 h-0.5 mx-1', n < current ? 'bg-brand' : 'bg-border')}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Step 1 — Service selection ──────────────────────────────────────────────
function ServiceStep({
  selected,
  onSelect,
}: {
  selected: Service | null
  onSelect: (s: Service) => void
}) {
  return (
    <div>
      <p className="px-5 pt-3.5 pb-3 font-nunito font-bold text-[15px] text-text-primary">
        Choose a service
      </p>
      {SERVICES.map((svc) => {
        const active = selected?.id === svc.id
        return (
          <button
            key={svc.id}
            onClick={() => onSelect(svc)}
            className={cn(
              'flex items-center gap-3 mx-5 mb-2.5 p-4 rounded-[16px] border w-[calc(100%-40px)] transition-colors',
              active ? 'border-brand bg-brand-muted' : 'border-border bg-white',
            )}
          >
            <div className="w-12 h-12 bg-brand-pale rounded-[12px] flex items-center justify-center flex-shrink-0">
              <i className={`ti ${svc.icon} text-[24px] text-brand-light`} aria-hidden="true" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-nunito font-bold text-[14px] text-text-primary">{svc.name}</p>
              <p className="text-[12px] text-text-muted mt-0.5">{svc.duration}</p>
            </div>
            <p className="font-nunito font-extrabold text-[16px] text-brand">{svc.price}</p>
            <i
              className={cn(
                'ti text-[20px]',
                active ? 'ti-circle-check text-brand' : 'ti-circle text-border',
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
  selectedDate,
  selectedTime,
  onDateSelect,
  onTimeSelect,
}: {
  selectedDate: string | null
  selectedTime: string | null
  onDateSelect: (d: string) => void
  onTimeSelect: (t: string) => void
}) {
  const today = 8 // May 8 2026
  const firstDay = 4 // May 1 2026 is a Friday (index 4 in Su-Sa grid)
  const daysInMonth = 31

  return (
    <div>
      <p className="px-5 pt-3.5 pb-3 font-nunito font-bold text-[15px] text-text-primary">
        Pick a date & time
      </p>
      {/* Calendar */}
      <div className="mx-5">
        <div className="flex items-center justify-between mb-3">
          <span className="font-nunito font-extrabold text-[16px] text-text-primary">May 2026</span>
          <button className="w-8 h-8 rounded-full bg-surface-secondary flex items-center justify-center">
            <i className="ti ti-chevron-right text-[14px] text-text-secondary" aria-hidden="true" />
          </button>
        </div>
        {/* Day names */}
        <div className="grid grid-cols-7 text-center mb-1.5">
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
            <span key={d} className="text-[11px] font-semibold text-text-muted py-1">{d}</span>
          ))}
        </div>
        {/* Days */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
            const past   = d < today
            const isToday = d === today
            const dateStr = `May ${d}, 2026`
            const active  = selectedDate === dateStr
            return (
              <button
                key={d}
                disabled={past}
                onClick={() => onDateSelect(dateStr)}
                className={cn(
                  'aspect-square flex items-center justify-center text-[13px] font-semibold font-nunito rounded-full transition-colors',
                  past    && 'text-border cursor-not-allowed',
                  isToday && !active && 'text-brand',
                  active  && 'bg-brand text-white',
                  !past && !active && !isToday && 'text-text-primary hover:bg-surface-secondary',
                )}
              >
                {d}
              </button>
            )
          })}
        </div>
      </div>

      {/* Time slots */}
      {selectedDate && (
        <div className="px-5 pt-4">
          <p className="text-[12px] font-semibold text-text-muted uppercase tracking-wide mb-2">
            Available times
          </p>
          <div className="grid grid-cols-3 gap-2">
            {TIME_SLOTS.map(({ time, available }) => (
              <button
                key={time}
                disabled={!available}
                onClick={() => available && onTimeSelect(time)}
                className={cn(
                  'py-2.5 border rounded-[12px] text-[13px] font-semibold font-nunito transition-colors',
                  !available          && 'text-border bg-surface border-border cursor-not-allowed',
                  available && selectedTime !== time && 'text-text-primary bg-white border-border hover:border-brand',
                  selectedTime === time && 'bg-brand text-white border-brand',
                )}
              >
                {time}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Step 3 — Confirm ────────────────────────────────────────────────────────
function ConfirmStep({
  draft,
  onChange,
}: {
  draft: BookingDraft
  onChange: (fields: Partial<BookingDraft>) => void
}) {
  return (
    <div>
      <p className="px-5 pt-3.5 pb-1 font-nunito font-bold text-[15px] text-text-primary">
        Confirm booking
      </p>
      {/* Summary card */}
      <div className="mx-5 mt-3 bg-white rounded-[20px] border border-border overflow-hidden">
        {[
          { label: 'Service', value: draft.service?.name ?? '—' },
          { label: 'Date',    value: draft.date ?? '—'          },
          { label: 'Time',    value: draft.time ?? '—'          },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="flex items-center justify-between px-5 py-3 border-b border-border last:border-none"
          >
            <span className="text-[13px] font-semibold text-text-muted">{label}</span>
            <span className="text-[13px] font-bold text-text-primary">{value}</span>
          </div>
        ))}
        <div className="flex items-center justify-between px-5 py-3">
          <span className="text-[15px] font-bold text-text-primary">Total</span>
          <span className="font-nunito font-extrabold text-[18px] text-brand">
            {draft.service?.price ?? '—'}
          </span>
        </div>
      </div>

      {/* Dog name */}
      <div className="px-5 mt-4">
        <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wide mb-1.5">
          Dog's name
        </label>
        <input
          type="text"
          placeholder="e.g. Mochi"
          value={draft.dogName}
          onChange={(e) => onChange({ dogName: e.target.value })}
          className="w-full px-4 py-3 border border-border rounded-[14px] text-[14px] font-nunito-sans text-text-primary bg-white outline-none focus:border-brand"
        />
      </div>

      {/* Notes */}
      <div className="px-5 mt-3">
        <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wide mb-1.5">
          Notes for groomer (optional)
        </label>
        <textarea
          rows={3}
          placeholder="Any special requests..."
          value={draft.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          className="w-full px-4 py-3 border border-border rounded-[14px] text-[14px] font-nunito-sans text-text-primary bg-white outline-none focus:border-brand resize-none"
        />
      </div>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function BookPage() {
  const [step, setStep] = useState<Step>(1)
  const [draft, setDraft] = useState<BookingDraft>({
    service:  null,
    date:     null,
    time:     null,
    dogName:  '',
    notes:    '',
    dogSize:  null,
    breedId:  null,
  })

  const updateDraft = (fields: Partial<BookingDraft>) =>
    setDraft((prev) => ({ ...prev, ...fields }))

  const canContinue =
    (step === 1 && draft.service !== null) ||
    (step === 2 && draft.date !== null && draft.time !== null) ||
    step === 3

  function handleContinue() {
    if (step < 3) setStep((s) => (s + 1) as Step)
    // Step 3: submit — wire up your API call here
    // e.g. await createBooking(draft)
  }

  return (
    <div className="app-shell flex flex-col h-dvh">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-4">
        <button
          onClick={() => (step > 1 ? setStep((s) => (s - 1) as Step) : undefined)}
          className="w-9 h-9 rounded-full bg-surface-secondary flex items-center justify-center flex-shrink-0"
          aria-label="Back"
        >
          <Link href={step === 1 ? '/' : '#'}>
            <i className="ti ti-arrow-left text-[18px] text-text-secondary" aria-hidden="true" />
          </Link>
        </button>
        <span className="font-nunito font-extrabold text-xl text-text-primary">
          Book a session
        </span>
      </div>

      <StepIndicator current={step} />

      {/* Scrollable step content */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-2">
        {step === 1 && (
          <ServiceStep
            selected={draft.service}
            onSelect={(s) => updateDraft({ service: s })}
          />
        )}
        {step === 2 && (
          <DateTimeStep
            selectedDate={draft.date}
            selectedTime={draft.time}
            onDateSelect={(d) => updateDraft({ date: d, time: null })}
            onTimeSelect={(t) => updateDraft({ time: t })}
          />
        )}
        {step === 3 && (
          <ConfirmStep draft={draft} onChange={updateDraft} />
        )}
      </div>

      {/* CTA */}
      <div className="px-5 py-3.5 bg-surface">
        <button
          disabled={!canContinue}
          onClick={handleContinue}
          className="w-full bg-brand text-white font-nunito font-bold text-base rounded-full py-4 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity active:opacity-80"
        >
          {step === 3 ? 'Confirm booking' : 'Continue'}
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
