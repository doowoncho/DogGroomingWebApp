'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { SERVICES, TIME_SLOTS, GROOMING_STYLES } from '@/lib/data'
import type { BookingDraft, Service } from '@/types'
import BottomNav from '@/components/layout/BottomNav'
import AccountCreationPage from '../account/AccountCreationPage'

type Step = 1 | 2 | 3 | 4

const DOG_BREEDS = [
  'Golden Retriever',
  'Labrador Retriever',
  'German Shepherd',
  'French Bulldog',
  'Poodle',
  'Shih Tzu',
  'Corgi',
  'Pomeranian',
  'Husky',
  'Chihuahua',
  'Maltese',
  'Yorkshire Terrier',
  'Dachshund',
  'Samoyed',
  'Border Collie',
  'Australian Shepherd',
  'Cavalier King Charles Spaniel',
  'Bichon Frise',
  'Bernedoodle',
  'Goldendoodle',
  'Miniature Schnauzer',
  'Schnauzer'
]

// ─── Step indicator ──────────────────────────────────────────────────────────
function StepIndicator({ current, total }: { current: Step; total: number }) {
  return (
    <div className="flex items-center px-5 py-3.5">
      {Array.from({ length: total }, (_, i) => (i + 1) as Step).map((n, i) => (
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
          {i < total - 1 && (
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
  const [viewingDate, setViewingDate] = useState(new Date(2026, 4, 8)) // May 8, 2026

  const year = viewingDate.getFullYear()
  const month = viewingDate.getMonth()
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month
  const todayDate = isCurrentMonth ? today.getDate() : null

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  const handlePrevMonth = () => {
    setViewingDate(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setViewingDate(new Date(year, month + 1, 1))
  }

  return (
    <div>
      <p className="px-5 pt-3.5 pb-3 font-nunito font-bold text-[15px] text-text-primary ">
        Pick a date & time
      </p>
      {/* Calendar */}
      <div className="mx-5">
        <div className="flex items-center justify-between mb-3">
          <span className="font-nunito font-extrabold text-[16px] text-text-primary">
            {monthNames[month]} {year}
          </span>
          <div className="flex gap-1">
            <button
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-full bg-surface-secondary flex items-center justify-center hover:bg-border transition-colors"
              aria-label="Previous month"
            >
              <i className="ti ti-chevron-left text-[14px] text-text-secondary" aria-hidden="true" />
            </button>
            <button
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-full bg-surface-secondary flex items-center justify-center hover:bg-border transition-colors"
              aria-label="Next month"
            >
              <i className="ti ti-chevron-right text-[14px] text-text-secondary" aria-hidden="true" />
            </button>
          </div>
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
            const date = new Date(year, month, d)
            const isPast = date < new Date()
            const isToday = todayDate === d
            const dateStr = `${monthNames[month]} ${d}, ${year}`
            const active = selectedDate === dateStr
            return (
              <button
                key={d}
                disabled={isPast}
                onClick={() => onDateSelect(dateStr)}
                className={cn(
                  'aspect-square md:aspect-auto md:h-18 flex items-center justify-center text-[13px] font-semibold font-nunito rounded-full transition-colors',
                  isPast && 'text-border cursor-not-allowed',
                  isToday && !active && 'text-brand',
                  active && 'bg-brand text-white',
                  !isPast && !active && !isToday && 'text-text-primary hover:bg-surface-secondary',
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

// ─── Step 3 — Style & Photo ────────────────────────────────────────────────
function StyleStep({
  selectedStyle,
  photoUrl,
  onStyleSelect,
  onPhotoUpload,
}: {
  selectedStyle: string | null
  photoUrl: string | null
  onStyleSelect: (id: string) => void
  onPhotoUpload: (url: string) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const url = event.target?.result as string
        onPhotoUpload(url)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div>
      <p className="px-5 pt-3.5 pb-3 font-nunito font-bold text-[15px] text-text-primary">
        Choose a style
      </p>
      <div className="px-5 grid grid-cols-2 gap-2.5">
        {GROOMING_STYLES.map((style) => {
          const active = selectedStyle === style.id
          return (
            <button
              key={style.id}
              onClick={() => onStyleSelect(style.id)}
              className={cn(
                'flex flex-col items-center gap-2 p-3.5 rounded-[14px] border transition-colors',
                active ? 'border-brand bg-brand-muted' : 'border-border bg-white',
              )}
            >
              <span className="text-[32px]">{style.emoji}</span>
              <div className="text-center">
                <p className="text-[13px] font-bold font-nunito text-text-primary">{style.name}</p>
                <p className="text-[10px] text-text-muted mt-0.5">{style.desc}</p>
              </div>
              {active && (
                <i className="ti ti-circle-check text-brand text-[16px] mt-1" aria-hidden="true" />
              )}
            </button>
          )
        })}
      </div>

      {/* Photo upload */}
      <div className="px-5 mt-5">
        <p className="font-nunito font-bold text-[15px] text-text-primary mb-3">
          Upload a photo (optional)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        {photoUrl ? (
          <div className="relative rounded-[14px] overflow-hidden bg-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt="Dog" className="w-full h-auto" />
            <button
              onClick={() => {
                fileInputRef.current?.click()
              }}
              className="absolute bottom-3 right-3 bg-brand text-white rounded-full p-2 flex items-center justify-center"
              aria-label="Change photo"
            >
              <i className="ti ti-edit text-[16px]" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-border rounded-[14px] py-8 flex flex-col items-center gap-2 hover:border-brand transition-colors"
          >
            <i className="ti ti-photo-plus text-[32px] text-text-muted" aria-hidden="true" />
            <span className="text-[13px] font-semibold text-text-secondary">Add a photo</span>
            <span className="text-[11px] text-text-muted">Show your groomer what you want</span>
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Step 4 — Confirm ────────────────────────────────────────────────────────
function ConfirmStep({
  draft,
  onChange,
}: {
  draft: BookingDraft
  onChange: (fields: Partial<BookingDraft>) => void
}) {
  const selectedStyle = GROOMING_STYLES.find((s) => s.id === draft.styleId)

  const [breedQuery, setBreedQuery] = useState(draft.breed ?? '')

const filteredBreeds = DOG_BREEDS.filter((breed) =>
  breed.toLowerCase().includes(breedQuery.toLowerCase())
).filter((breed) => breed !== breedQuery)
 .slice(0, 6)

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
          { label: 'Style',   value: selectedStyle?.name ?? '—' },
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
                <label className="block text-[12px] font-bold text-text-secondary uppercase mb-1.5">
          Everything autofilled if you have an account and signed in
        </label>
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

        {/* Dog breed */}
      <div className="px-5 mt-3 relative">
        <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wide mb-1.5">
          Dog breed
        </label>

        <input
          type="text"
          placeholder="Search breed..."
          value={breedQuery}
          onChange={(e) => {
            setBreedQuery(e.target.value)
            onChange({ breed: e.target.value })
          }}
          className="w-full px-4 py-3 border border-border rounded-[14px] text-[14px] font-nunito-sans text-text-primary bg-white outline-none focus:border-brand"
        />

            {breedQuery.length > 0 && filteredBreeds.length > 0 && (
              <div className="absolute left-5 right-5 mt-1 bg-white border border-border rounded-[14px] shadow-lg overflow-hidden z-20">
                {filteredBreeds.map((breed) => (
                  <button
                    key={breed}
                    type="button"
                    onClick={() => {
                      setBreedQuery(breed)
                      onChange({ breed })
                    }}
                    className="w-full text-left px-4 py-3 text-[14px] font-medium text-text-primary hover:bg-surface-secondary transition-colors"
                  >
                    {breed}
                  </button>
                ))}
              </div>
            )}
          </div>


      {/* Email */}
      <div className="px-5 mt-3">
        <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wide mb-1.5">
          Email
        </label>
        <input
          type="email"
          placeholder="your@email.com"
          value={draft.email}
          onChange={(e) => onChange({ email: e.target.value })}
          className="w-full px-4 py-3 border border-border rounded-[14px] text-[14px] font-nunito-sans text-text-primary bg-white outline-none focus:border-brand"
        />
      </div>

      {/* Phone */}
      <div className="px-5 mt-3">
        <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wide mb-1.5">
          Phone
        </label>
        <input
          type="tel"
          placeholder="(123) 456-7890"
          value={draft.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
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

// ─── Confirmation page ───────────────────────────────────────────────────────
function ConfirmationPage({ draft, onCreateAccount }: { draft: BookingDraft; onCreateAccount: () => void }) {
  const selectedStyle = GROOMING_STYLES.find((s) => s.id === draft.styleId)

  return (
    <div className="flex flex-col items-center justify-center px-5 py-8 text-center">
      <div className="w-16 h-16 bg-brand-pale rounded-full flex items-center justify-center mb-4">
        <i className="ti ti-circle-check text-brand text-[32px]" aria-hidden="true" />
      </div>
      
      <h2 className="font-nunito font-extrabold text-2xl text-text-primary mb-2">
        Booking confirmed!
      </h2>
      
      <p className="text-text-secondary text-[14px] mb-6">
        We've received your booking request. A confirmation email will be sent shortly.
      </p>

      {/* Booking summary */}
      <div className="w-full bg-white rounded-[20px] border border-border p-5 mb-6">
        <div className="space-y-3">
          {[
            { label: 'Dog', value: draft.dogName || '—' },
            { label: 'Service', value: draft.service?.name ?? '—' },
            { label: 'Date', value: draft.date ?? '—' },
            { label: 'Time', value: draft.time ?? '—' },
             ...(selectedStyle ? [{ label: 'Style', value: selectedStyle.name }] : []),
          ]
            .filter(Boolean)
            .map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between pb-3 border-b border-border last:border-none last:pb-0">
                <span className="text-[13px] font-semibold text-text-muted">{label}</span>
                <span className="text-[13px] font-bold text-text-primary">{value}</span>
              </div>
            ))}
        </div>
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-border">
          <span className="text-[14px] font-bold text-text-primary">Total</span>
          <span className="font-nunito font-extrabold text-[18px] text-brand">
            {draft.service?.price ?? '—'}
          </span>
        </div>
      </div>

      <p className="text-[12px] text-text-muted mb-6">
        You'll receive an email confirmation at <span className="font-semibold">{draft.email}</span> with all the details and a link to manage your booking.
      </p>

      <div className="w-full space-y-3">
        <button
          onClick={onCreateAccount}
          className="w-full bg-brand text-white font-nunito font-bold text-base rounded-full py-4 transition-opacity active:opacity-80"
        >
          Create account
        </button>
        <Link
          href="/"
          className="w-full bg-white text-brand font-nunito font-bold text-base rounded-full py-4 border-2 border-brand flex items-center justify-center transition-opacity active:opacity-80"
        >
          Continue as guest
        </Link>
      </div>
    </div>
  )
}

export default function BookPage() {
  const [step, setStep] = useState<Step>(1)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)
  const [draft, setDraft] = useState<BookingDraft>({
    service:   null,
    date:      null,
    time:      null,
    styleId:   null,
    photoUrl:  null,
    dogName:   '',
    email:     '',
    phone:     '',
    notes:     '',
    breed:   null,
  })

  const updateDraft = (fields: Partial<BookingDraft>) =>
    setDraft((prev) => ({ ...prev, ...fields }))

  // Check if selected service needs styling (grooming/haircut services)
  const serviceNeedsStyle = draft.service?.id === 'groom' || draft.service?.id === 'spa'

  const canContinue =
    (step === 1 && draft.service !== null) ||
    (step === 2 && draft.date !== null && draft.time !== null) ||
    (step === 3 && draft.styleId !== null) ||
    (step === 4 && draft.dogName && draft.email && draft.phone)

  function handleContinue() {
    // Skip style step if service doesn't need styling
    if (step === 2 && !serviceNeedsStyle) {
      setStep(4)
    } else if (step < 4) {
      setStep((s) => (s + 1) as Step)
    } else if (step === 4) {
      // Submit booking and show confirmation
      setIsConfirmed(true)
      // TODO: wire up API call here
      // e.g. await createBooking(draft)
    }
  }

  function handleBack() {
    if (step === 4 && !serviceNeedsStyle) {
      // Skip style step when going back if service doesn't need styling
      setStep(2)
    } else if (step > 1) {
      setStep((s) => (s - 1) as Step)
    }
  }

  // Show account creation page
  if (isCreatingAccount) {
    return (
      <div className="app-shell flex flex-col h-dvh">
        <div className="flex items-center gap-3 px-5 pt-4 pb-4 border-b border-border">
          <button
            onClick={() => setIsCreatingAccount(false)}
            className="w-9 h-9 rounded-full bg-surface-secondary flex items-center justify-center flex-shrink-0"
            aria-label="Back"
          >
            <i className="ti ti-arrow-left text-[18px] text-text-secondary" aria-hidden="true" />
          </button>
          <span className="font-nunito font-extrabold text-xl text-text-primary">
            Create account
          </span>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <AccountCreationPage 
            draft={draft} 
            onComplete={() => {
              // Account created, redirect to home
              setTimeout(() => {
                window.location.href = '/'
              }, 500)
            }}
          />
        </div>
        <BottomNav />
      </div>
    )
  }

  // Show confirmation page
  if (isConfirmed) {
    return (
      <div className="app-shell flex flex-col h-dvh">
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <ConfirmationPage 
            draft={draft} 
            onCreateAccount={() => setIsCreatingAccount(true)}
          />
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="app-shell flex flex-col h-dvh">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-4">
        <button
          onClick={step === 1 ? undefined : handleBack}
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

      <StepIndicator 
        current={serviceNeedsStyle ? step : (step === 4 ? 3 : step) as Step} 
        total={serviceNeedsStyle ? 4 : 3} 
      />

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
          <StyleStep
            selectedStyle={draft.styleId}
            photoUrl={draft.photoUrl}
            onStyleSelect={(id) => updateDraft({ styleId: id })}
            onPhotoUpload={(url) => updateDraft({ photoUrl: url })}
          />
        )}
        {step === 4 && (
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
          {step === 4 ? 'Confirm booking' : 'Continue'}
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
