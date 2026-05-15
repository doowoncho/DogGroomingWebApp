'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/LanguageContext'
import { translations } from '@/lib/translations'
import type { BookingDraft, GroomingStyle, Service } from '@/types'
import { useServices } from '@/lib/hooks/useServices'
import { useStyles } from '@/lib/hooks/useStyles'

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
  'Schnauzer',
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
}: {
  selectedServiceId: number | null
  onSelect: (s: Service) => void
  language: string
  t: any
}) {
  const { services, loading, error  } = useServices(language, t)

  const selected = services.find((s) => s.id === selectedServiceId) ?? null

  if (loading) {
    return (
      <div className="px-5 pt-3.5 space-y-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[76px] rounded-[16px] bg-surface-secondary animate-pulse" />
        ))}
      </div>
    )
  }

    if (error) {
    return (
      <p className="px-5 pt-3.5 text-[14px] text-red-500">{error}</p>
    )
  }

  return (
    <div>
      <p className="px-5 pt-1 font-nunito font-bold text-[15px] text-text-primary">
        {t.booking.chooseService}
      </p>
      {services.map((svc) => {
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
              <p className="text-[12px] text-text-muted mt-0.5">{svc.duration} {t.services.minute}</p>
            </div>
            <p className="font-nunito font-extrabold text-[16px] text-brand">${svc.price}</p>
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
  selectedService,
  onDateSelect,
  onTimeSelect,
  t,
}: {
  selectedDate: string | null
  selectedTime: string | null
  selectedService: Service | null
  onDateSelect: (d: string) => void
  onTimeSelect: (t: string) => void
  language: string
  t: any
}) {
  const [viewingDate, setViewingDate] = useState(new Date(2026, 4, 8))
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

  return (
    <div>
      <p className="px-5 pt-3.5 pb-3 font-nunito font-bold text-[15px] text-text-primary">
        {t.booking.pickDateTime}
      </p>
      <div className="mx-5">
        <div className="flex items-center justify-between mb-3">
          <span className="font-nunito font-extrabold text-[16px] text-text-primary">
            {monthNames[month]} {year}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setViewingDate(new Date(year, month - 1, 1))}
              className="w-8 h-8 rounded-full bg-surface-secondary flex items-center justify-center hover:bg-border transition-colors"
              aria-label="Previous month"
            >
              <i className="ti ti-chevron-left text-[14px] text-text-secondary" aria-hidden="true" />
            </button>
            <button
              onClick={() => setViewingDate(new Date(year, month + 1, 1))}
              className="w-8 h-8 rounded-full bg-surface-secondary flex items-center justify-center hover:bg-border transition-colors"
              aria-label="Next month"
            >
              <i className="ti ti-chevron-right text-[14px] text-text-secondary" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 text-center mb-1.5">
          {t.dayAbbr.map((d: string) => (
            <span key={d} className="text-[11px] font-semibold text-text-muted py-1">{d}</span>
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
                disabled={isPast}
                onClick={() => {
                  onDateSelect(isoDate)
                  fetchSlots(isoDate)
                }}
                className={cn(
                  'aspect-square flex items-center justify-center text-[13px] font-semibold font-nunito rounded-full transition-colors',
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

      {selectedDate && (
        <div className="px-5 pt-4">
          <p className="text-[12px] font-semibold text-text-muted uppercase tracking-wide mb-2">
            {t.booking.availableTimes}
          </p>
          {loadingSlots ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="py-2.5 border border-border rounded-[12px] bg-surface-secondary animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map(({ time, available }) => (
                <button
                  key={time}
                  disabled={!available}
                  onClick={() => available && onTimeSelect(time)}
                  className={cn(
                    'py-2.5 border rounded-[12px] text-[13px] font-semibold font-nunito transition-colors',
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

// ─── Step 3 — Style & Photo ───────────────────────────────────────────────────
function StyleStep({
  selectedStyle,
  photoUrls,
  onStyleSelect,
  onPhotoUpload,
  onFilesSelect,
  language,
  t,
}: {
  selectedStyle: GroomingStyle | null
  photoUrls: string[]
  onStyleSelect: (style: GroomingStyle) => void
  onPhotoUpload: (urls: string[]) => void
  onFilesSelect: (files: File[]) => void
  language: string
  t: any
}){
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { styles, loading, error } = useStyles(language, t)

 const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files ?? [])

    if (!files.length) return

    // create preview urls
    const previews = files.map((file) =>
      URL.createObjectURL(file)
    )

    // append previews instead of replacing
    onPhotoUpload([...photoUrls, ...previews])

    // append actual files
    onFilesSelect(files)

    // IMPORTANT:
    // reset input so selecting same image again still works
    e.target.value = ''
  }

  if (loading) {
    return (
      <div className="px-5 pt-3.5 grid grid-cols-2 gap-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-[140px] rounded-[14px] bg-surface-secondary animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <p className="px-5 pt-3.5 text-[14px] text-red-500">
        {error}
      </p>
    )
  }

  return (
    <div>
      <p className="px-5 pt-3.5 pb-3 font-nunito font-bold text-[15px] text-text-primary">
        {t.booking.chooseStyle}
      </p>

      <div className="px-5 grid grid-cols-2 gap-2.5">
        {styles.map((style) => {
          const active = selectedStyle?.id === style.id

          return (
            <button
              key={style.id}
              onClick={() => onStyleSelect(style)}
              className={cn(
                'flex flex-col items-center gap-2 p-3.5 rounded-[14px] border transition-colors',
                active
                  ? 'border-brand bg-brand-muted'
                  : 'border-border bg-white',
              )}
            >
              <span className="text-[32px]">
                {style.emoji}
              </span>

              <div className="text-center">
                <p className="text-[13px] font-bold font-nunito text-text-primary">
                  {style.name}
                </p>

                <p className="text-[10px] text-text-muted mt-0.5">
                  {style.desc}
                </p>
              </div>

              {active && (
                <i
                  className="ti ti-circle-check text-brand text-[16px] mt-1"
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
      </div>

    <div className="px-5 mt-5">
      <p className="font-nunito font-bold text-[15px] text-text-primary mb-3">
        {t.booking.addPhoto}
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
        {photoUrls.length > 0 ? (
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {photoUrls.map((url, index) => (
            <div
              key={index}
              className="relative rounded-[14px] overflow-hidden bg-border"
            >
              <img
                src={url}
                alt={`Dog ${index + 1}`}
                className="w-full h-32 object-cover"
              />

              <button
               onClick={() =>
                  onPhotoUpload(
                    photoUrls.filter((_, i) => i !== index)
                  )
                }
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1"
              >
                <i className="ti ti-x text-[14px]" />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-border rounded-[14px] py-4 flex items-center justify-center gap-2 hover:border-brand transition-colors"
        >
          <i className="ti ti-photo-plus text-[20px] text-text-muted" />
          <span className="text-[13px] font-semibold text-text-secondary">
            Add more photos
          </span>
        </button>
      </div>
    ) : (
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full border-2 border-dashed border-border rounded-[14px] py-8 flex flex-col items-center gap-2 hover:border-brand transition-colors"
      >
        <i className="ti ti-photo-plus text-[32px] text-text-muted" />
        <span className="text-[13px] font-semibold text-text-secondary">
          {t.booking.addPhoto}
        </span>
        <span className="text-[11px] text-text-muted">
          {t.booking.showGroomerWhatYouWant}
        </span>
      </button>
    )}
  </div>
    </div>
  )
}

// ─── Step 4 — Confirm ────────────────────────────────────────────────────────
function ConfirmStep({
  draft,
  selectedStyle,
  selectedService,
  onChange,
  serviceNeedsStyle,
  t,
}: {
  draft: BookingDraft
  selectedStyle: GroomingStyle | null
  selectedService: Service | null
  onChange: (fields: Partial<BookingDraft>) => void
  serviceNeedsStyle: boolean
  t: any
}) {
  const [breedQuery, setBreedQuery] = useState(draft.breed ?? '')

  const filteredBreeds = DOG_BREEDS.filter((breed) =>
    breed.toLowerCase().includes(breedQuery.toLowerCase()),
  )
    .filter((breed) => breed !== breedQuery)
    .slice(0, 6)

  return (
    <div>
      <p className="px-5 pt-3.5 pb-1 font-nunito font-bold text-[15px] text-text-primary">
        {t.booking.confirmBooking}
      </p>
      <div className="mx-5 mt-3 bg-white rounded-[20px] border border-border overflow-hidden">
        {[
          { label: t.booking.service, value: selectedService?.name ?? '—' },
          { label: t.booking.date, value: draft.date ?? '—' },
          { label: t.booking.time, value: draft.time ?? '—' },
           ...(serviceNeedsStyle
        ? [{ label: t.booking.style, value: selectedStyle?.name ?? '—' }]
        : []),
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
          <span className="text-[15px] font-bold text-text-primary">{t.booking.total}</span>
          <span className="font-nunito font-extrabold text-[18px] text-brand">
            ${selectedService?.price ?? '—'}
          </span>
        </div>
      </div>

      <div className="px-5 mt-4">
        <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wide mb-1.5">
          {t.booking.dogName}
        </label>
        <input
          type="text"
          placeholder="e.g. Mochi"
          value={draft.dogName}
          onChange={(e) => onChange({ dogName: e.target.value })}
          className="w-full px-4 py-3 border border-border rounded-[14px] text-[14px] font-nunito-sans text-text-primary bg-white outline-none focus:border-brand"
        />
      </div>

      <div className="px-5 mt-3 relative">
        <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wide mb-1.5">
          {t.booking.dogBreed}
        </label>
        <input
          type="text"
          placeholder={t.booking.searchBreed}
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

      <div className="px-5 mt-3">
        <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wide mb-1.5">
          {t.booking.email}
        </label>
        <input
          type="email"
          placeholder="your@email.com"
          value={draft.email}
          onChange={(e) => onChange({ email: e.target.value })}
          className="w-full px-4 py-3 border border-border rounded-[14px] text-[14px] font-nunito-sans text-text-primary bg-white outline-none focus:border-brand"
        />
      </div>

      <div className="px-5 mt-3">
        <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wide mb-1.5">
          {t.booking.phone}
        </label>
        <input
          type="tel"
          placeholder="(123) 456-7890"
          value={draft.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          className="w-full px-4 py-3 border border-border rounded-[14px] text-[14px] font-nunito-sans text-text-primary bg-white outline-none focus:border-brand"
        />
      </div>

      <div className="px-5 mt-3 pb-2">
        <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wide mb-1.5">
          {t.booking.notesForGroomer}
        </label>
        <textarea
          rows={3}
          placeholder={t.booking.anySpecialRequests}
          value={draft.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          className="w-full px-4 py-3 border border-border rounded-[14px] text-[14px] font-nunito-sans text-text-primary bg-white outline-none focus:border-brand resize-none"
        />
      </div>
    </div>
  )
}

// ─── Confirmation page ────────────────────────────────────────────────────────
function ConfirmationPage({
  draft,
  selectedStyle,
  selectedService,
  onCreateAccount,
  t,
}: {
  draft: BookingDraft
  selectedService: Service | null
  selectedStyle: GroomingStyle | null
  onCreateAccount: () => void
  t: any
}) {

  return (
    <div className="flex flex-col items-center justify-center px-5 py-8 text-center">
      <div className="w-16 h-16 bg-brand-pale rounded-full flex items-center justify-center mb-4">
        <i className="ti ti-circle-check text-brand text-[32px]" aria-hidden="true" />
      </div>
      <h2 className="font-nunito font-extrabold text-2xl text-text-primary mb-2">
        {t.booking.bookingConfirmed}
      </h2>
      <p className="text-text-secondary text-[14px] mb-6">
        {t.booking.bookingReceivedMessage}
      </p>

      <div className="w-full bg-white rounded-[20px] border border-border p-5 mb-6">
        <div className="space-y-3">
          <div className="flex justify-between pb-3 border-b border-border">
            <span className="text-[13px] font-semibold text-text-muted">{t.booking.dog}</span>
            <span className="text-[13px] font-bold text-text-primary">{draft.dogName || '—'}</span>
          </div>

          <div className="flex justify-between pb-3 border-b border-border">
            <span className="text-[13px] font-semibold text-text-muted">{t.booking.service}</span>
            <span className="text-[13px] font-bold text-text-primary">{selectedService?.name ?? '—'}</span>
          </div>

          <div className="flex justify-between pb-3 border-b border-border">
            <span className="text-[13px] font-semibold text-text-muted">{t.booking.date}</span>
            <span className="text-[13px] font-bold text-text-primary">{draft.date ?? '—'}</span>
          </div>

          <div className="flex justify-between pb-3 border-b border-border">
            <span className="text-[13px] font-semibold text-text-muted">{t.booking.time}</span>
            <span className="text-[13px] font-bold text-text-primary">{draft.time ?? '—'}</span>
          </div>

           <div className="flex justify-between pb-3 border-b border-border">
            <span className="text-[13px] font-semibold text-text-muted">{t.booking.phone}</span>
            <span className="text-[13px] font-bold text-text-primary">{draft.phone ?? '—'}</span>
          </div>


          {selectedService?.needs_style && (
            <div className="flex justify-between pb-3 border-b border-border">
              <span className="text-[13px] font-semibold text-text-muted">{t.booking.style}</span>
              <span className="text-[13px] font-bold text-text-primary">{selectedStyle?.name ?? '—'}</span>
            </div>
          )}
        </div>
      </div>

      <div className="w-full space-y-3">
        <button
          onClick={onCreateAccount}
          className="w-full bg-brand text-white font-nunito font-bold text-base rounded-full py-4 transition-opacity active:opacity-80"
        >
          {t.booking.createAccount}
        </button>
        <Link
          href="/"
          className="w-full bg-white text-brand font-nunito font-bold text-base rounded-full py-4 border-2 border-brand flex items-center justify-center transition-opacity active:opacity-80"
        >
          {t.booking.continueAsGuest}
        </Link>
      </div>
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

  const handleCreateAccount = async () => {
    if (!canCreate) return
    onComplete()
  }

  return (
    <div className="flex flex-col px-5 py-8">
      <h2 className="font-nunito font-extrabold text-2xl text-text-primary mb-2">
        {t.booking.createYourAccount}
      </h2>
      <p className="text-text-secondary text-[14px] mb-6">{t.booking.saveBookings}</p>

      <div className="mb-4">
        <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wide mb-1.5">
          {t.booking.email}
        </label>
        <input
          type="email"
          value={draft.email}
          disabled
          className="w-full px-4 py-3 border border-border rounded-[14px] text-[14px] font-nunito-sans text-text-muted bg-surface outline-none cursor-not-allowed"
        />
        <p className="text-[11px] text-text-muted mt-1">{t.booking.usesBookingEmail}</p>
      </div>

      <div className="mb-4">
        <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wide mb-1.5">
          {t.booking.password}
        </label>
        <input
          type="password"
          placeholder={t.booking.atLeast6Chars}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 border border-border rounded-[14px] text-[14px] font-nunito-sans text-text-primary bg-white outline-none focus:border-brand"
        />
      </div>

      <div className="mb-6">
        <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wide mb-1.5">
          {t.booking.confirmPassword}
        </label>
        <input
          type="password"
          placeholder={t.booking.confirmPassword}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-4 py-3 border border-border rounded-[14px] text-[14px] font-nunito-sans text-text-primary bg-white outline-none focus:border-brand"
        />
        {password && confirmPassword && password !== confirmPassword && (
          <p className="text-[11px] text-red-500 mt-1">{t.booking.passwordsDontMatch}</p>
        )}
      </div>

      <button
        disabled={!canCreate}
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
  const { language } = useLanguage()
  const t = translations[language]
  const { styles } = useStyles(language, t)
  const { services } = useServices(language, t)
  const [step, setStep] = useState<Step>(1)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [draft, setDraft] = useState<BookingDraft>({
    serviceId: null,
    date: null,
    time: null,
    styleId: null,
    photoUrls: [],
    dogName: '',
    email: '',
    phone: '',
    notes: '',
    breed: null,
  })

  const updateDraft = (fields: Partial<BookingDraft>) =>
    setDraft((prev) => ({ ...prev, ...fields }))

  function handleServiceSelect(service: Service) {
    updateDraft({ serviceId: service.id, date: null, time: null })
  }

  const selectedStyle = styles.find((s) => s.id === draft.styleId) ?? null

  const selectedService = services.find((s) => s.id === draft.serviceId) ?? null
  const serviceNeedsStyle = selectedService?.needs_style ?? false

  const canContinue =
  (step === 1 && draft.serviceId !== null) ||
  (step === 2 && draft.date !== null && draft.time !== null) ||
  (step === 3 && draft.styleId !== null) ||
  (step === 4 &&
    !!draft.dogName &&
    !!draft.email &&
    !!draft.phone)

const [isSubmitting, setIsSubmitting] = useState(false)
const [submitError, setSubmitError] = useState<string | null>(null)

async function handleContinue() {
  if (step === 2 && !serviceNeedsStyle) {
    setStep(4)
  } else if (step < 4) {
    setStep((s) => (s + 1) as Step)
  } else if (step === 4) {
    setIsSubmitting(true)
    setSubmitError(null)

    const payload = {
      service_id:     draft.serviceId,
      service_price:  selectedService?.price,
      duration_slots: selectedService?.slots,
      date:           draft.date,
      time:           draft.time,
      style_id:       draft.styleId,
      dog_name:       draft.dogName,
      breed:          draft.breed,
      email:          draft.email,
      phone:          draft.phone,
      notes:          draft.notes,
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
        setSubmitError(json.error)
        setStep(2)
        return
      }

      if (!res.ok) {
        setSubmitError(json.error ?? 'Something went wrong')
        return
      }

      // upload photos AFTER booking succeeds
      if (photoFiles.length > 0) {
        const formData = new FormData()

        formData.append('bookingId', json.booking.id)

        photoFiles.forEach((file) => {
          formData.append('files', file)
        })

        await fetch('/api/photos', {
          method: 'POST',
          body: formData,
        })
      }

    setIsConfirmed(true)
      } catch (err) {
        setSubmitError('Network error, please try again')
      } finally {
        setIsSubmitting(false)
      }
    }
}

  function handleBack() {
    if (step === 4 && !serviceNeedsStyle) {
      setStep(2)
    } else if (step > 1) {
      setStep((s) => (s - 1) as Step)
    }
  }

  if (isCreatingAccount) {
    return (
      <div>
        <div className="flex items-center gap-3 px-5 pt-4 pb-4 border-b border-border">
          <button
            onClick={() => setIsCreatingAccount(false)}
            className="w-9 h-9 rounded-full bg-surface-secondary flex items-center justify-center flex-shrink-0"
            aria-label="Back"
          >
            <i className="ti ti-arrow-left text-[18px] text-text-secondary" aria-hidden="true" />
          </button>
          <span className="font-nunito font-extrabold text-xl text-text-primary">
            {t.booking.createYourAccount}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <AccountCreationPage
            draft={draft}
            onComplete={() => {
              setTimeout(() => {
                window.location.href = '/'
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
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <ConfirmationPage
            draft={draft}
            selectedStyle={selectedStyle}
            selectedService={selectedService}
            onCreateAccount={() => setIsCreatingAccount(true)}
            t={t}
          />
        </div>
      </div>
    )
  }

  return (
    <div>
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
          {t.booking.bookASession}
        </span>
      </div>

      <StepIndicator
        current={serviceNeedsStyle ? step : (step === 4 ? 3 : step) as Step}
        total={serviceNeedsStyle ? 4 : 3}
      />

      <div className="flex-1 overflow-y-auto no-scrollbar pb-2">
        {step === 1 && (
          <ServiceStep
            selectedServiceId={draft.serviceId}
            onSelect={(s) => handleServiceSelect(s)}
            language={language}
            t={t}
          />
        )}
        {step === 2 && (
          <DateTimeStep
            selectedDate={draft.date}
            selectedTime={draft.time}
            selectedService={selectedService} 
            onDateSelect={(d) => updateDraft({ date: d, time: null })}
            onTimeSelect={(t) => updateDraft({ time: t })}
            language={language}
            t={t}
          />
        )}
        {step === 3 && (
          <StyleStep
            selectedStyle={selectedStyle}
            photoUrls={draft.photoUrls}
            onStyleSelect={(style) => updateDraft({ styleId: style.id })}
            onPhotoUpload={(urls) => updateDraft({ photoUrls: urls })}
            onFilesSelect={(files) => setPhotoFiles((prev) => [...prev, ...files])}
            language={language}
            t={t}
          />
        )}
        {step === 4 && (
          <ConfirmStep
            draft={draft}
            selectedStyle={selectedStyle}
            selectedService={selectedService}
            onChange={updateDraft}
            serviceNeedsStyle={serviceNeedsStyle}
            t={t}
          />
        )}
      </div>

      <div className="px-5 py-3.5 bg-surface">
        <button
          disabled={!canContinue}
          onClick={handleContinue}
          className="w-full bg-brand text-white font-nunito font-bold text-base rounded-full py-4 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity active:opacity-80"
        >
          {step === 4 ? t.booking.confirmBookingBtn : t.booking.continue}
        </button>
      </div>
    </div>
  )
}