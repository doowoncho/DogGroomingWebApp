'use client'

import type { Booking } from '@/types'
import { formatDateTime } from './lib'
import { DogAvatar, Sheet, StatusPill, btn } from './ui'

export type BookingAction = 'decline' | 'cancel' | 'completed'

export default function BookingDetail({ booking, serviceName, busy, error, onClose, onConfirm, onAction }: {
  booking: Booking | null
  serviceName: string
  busy: boolean
  error: string | null
  onClose: () => void
  onConfirm: (id: string) => void
  onAction: (type: BookingAction, id: string) => void
}) {
  if (!booking) return null
  const b = booking

  const footer =
    b.status === 'pending' ? (
      <div className="flex gap-2">
        <button onClick={() => onConfirm(b.id)} disabled={busy} className={`${btn.primary} flex-1`}>
          <i className="ti ti-check" aria-hidden="true" /> {busy ? 'Saving…' : 'Confirm'}
        </button>
        <button onClick={() => onAction('decline', b.id)} disabled={busy} className={`${btn.danger} flex-1`}>
          Decline
        </button>
      </div>
    ) : b.status === 'confirmed' ? (
      <div className="flex gap-2">
        <button onClick={() => onAction('completed', b.id)} disabled={busy} className={`${btn.primary} flex-1`}>
          <i className="ti ti-circle-check" aria-hidden="true" /> {busy ? 'Saving…' : 'Mark completed'}
        </button>
        <button onClick={() => onAction('cancel', b.id)} disabled={busy} className={`${btn.secondary} flex-1`}>
          Cancel appointment
        </button>
      </div>
    ) : null

  return (
    <Sheet
      open
      onClose={onClose}
      title="Appointment"
      footer={
        (footer || error) && (
          <>
            {footer}
            {error && <p className="text-xs text-red-500 text-center mt-2">{error}</p>}
          </>
        )
      }
    >
      <div className="flex items-center gap-3.5 mb-5">
        <DogAvatar name={b.dog_name} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="font-nunito font-extrabold text-xl text-text-primary truncate">{b.dog_name}</p>
          {b.breed && <p className="text-sm text-text-secondary truncate">{b.breed}</p>}
        </div>
        <StatusPill status={b.status} />
      </div>

      <div className="rounded-2xl bg-surface p-4 space-y-3 mb-4">
        <Row icon="ti-scissors" label="Service" value={serviceName || '—'} />
        <Row icon="ti-calendar-time" label="When" value={formatDateTime(b.date_time)} />
      </div>

      <p className="text-[11px] font-bold font-nunito text-text-secondary uppercase tracking-wide mb-2">Contact</p>
      <div className="grid gap-2 mb-4">
        {b.phone && (
          <a href={`tel:${b.phone}`} className="flex items-center gap-3 rounded-xl border border-border px-3.5 min-h-12 hover:bg-surface">
            <i className="ti ti-phone text-lg text-brand" aria-hidden="true" />
            <span className="text-sm font-bold font-nunito text-text-primary">{b.phone}</span>
          </a>
        )}
        {b.kakaoid && (
          <div className="flex items-center gap-3 rounded-xl border border-border px-3.5 min-h-12">
            <i className="ti ti-message-circle text-lg text-brand" aria-hidden="true" />
            <span className="text-sm font-bold font-nunito text-text-primary">{b.kakaoid}</span>
            <span className="text-xs text-text-secondary ml-auto">KakaoTalk</span>
          </div>
        )}
        {b.email && (
          <a href={`mailto:${b.email}`} className="flex items-center gap-3 rounded-xl border border-border px-3.5 min-h-12 hover:bg-surface min-w-0">
            <i className="ti ti-mail text-lg text-brand" aria-hidden="true" />
            <span className="text-sm font-bold font-nunito text-text-primary truncate">{b.email}</span>
          </a>
        )}
      </div>

      <p className="text-[11px] font-bold font-nunito text-text-secondary uppercase tracking-wide mb-2">Notes</p>
      <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap rounded-xl bg-surface px-3.5 py-3">
        {b.notes?.trim() || <span className="text-text-muted">No notes</span>}
      </p>
    </Sheet>
  )
}

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <i className={`ti ${icon} text-lg text-text-secondary`} aria-hidden="true" />
      <span className="text-sm text-text-secondary w-16">{label}</span>
      <span className="text-sm font-bold font-nunito text-text-primary flex-1 text-right">{value}</span>
    </div>
  )
}
