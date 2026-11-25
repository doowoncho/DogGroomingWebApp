'use client'

import { ReactNode, useEffect } from 'react'
import { STATUS_LABELS, STATUS_PILL, initials } from './lib'

// ─── Class presets ───────────────────────────────────────────────────────────
// Phones get 44px tap targets; desktop tightens to 36px.

const btnBase =
  'inline-flex items-center justify-center gap-1.5 rounded-full font-nunito font-bold text-sm whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-11 md:min-h-9 px-4'

export const btn = {
  primary:   `${btnBase} bg-brand text-white hover:bg-brand/90 active:bg-brand/80`,
  secondary: `${btnBase} bg-white border border-border text-text-primary hover:bg-surface active:bg-surface-secondary`,
  danger:    `${btnBase} bg-white border border-red-200 text-red-600 hover:bg-red-50`,
  success:   `${btnBase} bg-green-600 text-white hover:bg-green-700`,
  ghost:     `${btnBase} text-text-secondary hover:bg-surface-secondary`,
}

export const iconBtn =
  'w-11 h-11 md:w-9 md:h-9 flex-shrink-0 inline-flex items-center justify-center rounded-full text-text-secondary hover:bg-surface-secondary active:bg-surface-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed'

export const inputCls =
  'w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-nunito text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20'

export const cardCls = 'bg-white rounded-2xl border border-border'

// ─── Small pieces ────────────────────────────────────────────────────────────

export function StatusPill({ status, className = '' }: { status: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center text-[11px] leading-none px-2 py-1 rounded-full font-bold font-nunito ring-1 ring-inset whitespace-nowrap ${STATUS_PILL[status] ?? 'bg-gray-100 text-text-secondary ring-gray-200'} ${className}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

export function DogAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'w-14 h-14 text-lg' : size === 'sm' ? 'w-8 h-8 text-[11px]' : 'w-10 h-10 text-xs'
  return (
    <div className={`${cls} rounded-full bg-brand-pale flex items-center justify-center font-nunito font-extrabold text-brand flex-shrink-0`}>
      {initials(name) || <i className="ti ti-dog" aria-hidden="true" />}
    </div>
  )
}

export function SectionHeader({ icon, title, count, tone = 'default', action }: {
  icon?: string
  title: string
  count?: number
  tone?: 'default' | 'warning' | 'brand'
  action?: ReactNode
}) {
  const toneCls = tone === 'warning' ? 'text-amber-800' : tone === 'brand' ? 'text-brand' : 'text-text-primary'
  return (
    <div className="flex items-center justify-between gap-2 mb-2.5">
      <h2 className={`flex items-center gap-2 font-nunito font-extrabold text-base ${toneCls}`}>
        {icon && <i className={`ti ${icon} text-[18px]`} aria-hidden="true" />}
        {title}
        {count !== undefined && (
          <span className="text-xs font-bold text-text-secondary bg-surface-secondary rounded-full px-2 py-0.5">{count}</span>
        )}
      </h2>
      {action}
    </div>
  )
}

export function EmptyState({ icon, title, body }: { icon: string; title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-8">
      <div className="w-11 h-11 rounded-full bg-surface-secondary flex items-center justify-center mb-2.5">
        <i className={`ti ${icon} text-xl text-text-secondary`} aria-hidden="true" />
      </div>
      <p className="font-nunito font-bold text-sm text-text-primary">{title}</p>
      {body && <p className="text-xs text-text-secondary mt-1 max-w-xs">{body}</p>}
    </div>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold font-nunito text-text-secondary uppercase tracking-wide mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-text-muted mt-1">{hint}</span>}
    </label>
  )
}

// ─── Sheet ───────────────────────────────────────────────────────────────────
// Bottom sheet on phones, right-hand drawer from md up.

export function Sheet({ open, onClose, title, subtitle, children, footer }: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="absolute inset-x-0 bottom-0 max-h-[92dvh] rounded-t-3xl md:inset-y-0 md:left-auto md:right-0 md:w-[440px] md:max-h-none md:rounded-none md:rounded-l-3xl bg-white shadow-2xl flex flex-col"
      >
        <div className="md:hidden flex justify-center pt-2">
          <span className="w-10 h-1.5 rounded-full bg-gray-200" />
        </div>
        <div className="flex items-start justify-between gap-3 px-5 pt-3 md:pt-5 pb-3 border-b border-border">
          <div className="min-w-0">
            <h2 className="font-nunito font-extrabold text-lg text-text-primary truncate">{title}</h2>
            {subtitle && <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className={`${iconBtn} -mr-2`} aria-label="Close">
            <i className="ti ti-x text-[20px]" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer && <div className="border-t border-border px-5 pt-3 pb-safe md:pb-5 bg-white">{footer}</div>}
      </div>
    </div>
  )
}

// ─── Confirm dialog ──────────────────────────────────────────────────────────

export type ConfirmTone = 'danger' | 'success'

export function ConfirmDialog({ open, tone, icon, title, body, confirmLabel, cancelLabel, busy, error, onConfirm, onCancel }: {
  open: boolean
  tone: ConfirmTone
  icon: string
  title: string
  body: string
  confirmLabel: string
  cancelLabel: string
  busy?: boolean
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null
  const iconWrap = tone === 'danger' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-label={title}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl mb-[env(safe-area-inset-bottom)]">
        <div className={`w-12 h-12 rounded-full ${iconWrap} flex items-center justify-center mx-auto mb-3`}>
          <i className={`ti ${icon} text-2xl`} aria-hidden="true" />
        </div>
        <p className="font-nunito font-extrabold text-text-primary mb-1.5">{title}</p>
        <p className="text-sm text-text-secondary mb-5 leading-relaxed">{body}</p>
        <div className="flex flex-col gap-2">
          <button onClick={onConfirm} disabled={busy} className={tone === 'danger' ? btn.danger : btn.success}>
            {busy ? 'Working…' : confirmLabel}
          </button>
          <button onClick={onCancel} disabled={busy} className={btn.secondary}>
            {cancelLabel}
          </button>
        </div>
        {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
      </div>
    </div>
  )
}
