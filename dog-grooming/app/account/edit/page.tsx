'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/utils/supabase/client'

type Field = 'email' | 'phone'

export default function EditContactPage() {
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  const [editing, setEditing] = useState<Field | null>(null)
  const [saving, setSaving] = useState<Field | null>(null)
  const [success, setSuccess] = useState<Field | null>(null)
  const [error, setError] = useState<string | null>(null)

  const emailRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let mounted = true
    supabase.auth.getUser().then(({ data }) => {
      if (mounted && data.user) {
        setUser(data.user)
        setEmail(data.user.email ?? '')
        setPhone(data.user.user_metadata?.phone ?? data.user.phone ?? '')
        setLoading(false)
      } else if (mounted) {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        setEmail(session.user.email ?? '')
        setPhone(session.user.user_metadata?.phone ?? session.user.phone ?? '')
      }
      setLoading(false)
    })

    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  function startEditing(field: Field) {
    setEditing(field)
    setSuccess(null)
    setError(null)
    setTimeout(() => {
      (field === 'email' ? emailRef : phoneRef).current?.focus()
    }, 50)
  }

  function cancelEditing(field: Field) {
    setEditing(null)
    setError(null)
    if (field === 'email') setEmail(user?.email ?? '')
    if (field === 'phone') setPhone(user?.user_metadata?.phone ?? user?.phone ?? '')
  }

  async function handleSave(field: Field) {
    setError(null)
    setSaving(field)
    try {
      if (field === 'email') {
        const { error: err } = await supabase.auth.updateUser({ email })
        if (err) throw err
      } else {
        const { error: err } = await supabase.auth.updateUser({ data: { phone } })
        if (err) throw err
      }
      setSuccess(field)
      setEditing(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <div className="px-5 py-10 text-text-muted text-sm">Loading...</div>

  if (!user) return (
    <div className="px-5 py-10 text-center">
      <p className="text-text-muted mb-4">You are not logged in</p>
      <Link href="/login" className="bg-brand text-white px-5 py-3 rounded-full font-bold">Go to Login</Link>
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-border">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-border transition-colors"
        >
          <i className="ti ti-arrow-left text-[20px] text-text-primary" />
        </button>
        <h1 className="font-nunito font-extrabold text-[18px] text-text-primary">
          Edit Contact Info
        </h1>
      </div>

      <div className="flex-1 px-5 pt-6 space-y-4">

        {/* Global error */}
        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-[14px] px-4 py-3">
            <i className="ti ti-alert-circle text-[18px] text-red-500 mt-0.5 shrink-0" />
            <p className="text-[13px] text-red-600 leading-snug">{error}</p>
          </div>
        )}

        {/* Email */}
        <FieldCard
          icon="ti-mail"
          label="Email address"
          isEditing={editing === 'email'}
          successNote={success === 'email' ? 'Confirmation sent to your new email.' : undefined}
          onEdit={() => startEditing('email')}
        >
          <input
            ref={emailRef}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            readOnly={editing !== 'email'}
            placeholder="you@example.com"
            className={`w-full bg-transparent text-[14px] outline-none transition-colors
              ${editing === 'email'
                ? 'text-text-primary'
                : 'text-text-muted cursor-default select-none'
              }`}
          />
          {editing === 'email' && (
            <RowActions
              loading={saving === 'email'}
              onSave={() => handleSave('email')}
              onCancel={() => cancelEditing('email')}
            />
          )}
        </FieldCard>

        {/* Phone */}
        <FieldCard
          icon="ti-phone"
          label="Phone number"
          isEditing={editing === 'phone'}
          successNote={success === 'phone' ? 'Phone number updated.' : undefined}
          onEdit={() => startEditing('phone')}
        >
          <input
            ref={phoneRef}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            readOnly={editing !== 'phone'}
            placeholder="+1 (555) 000-0000"
            className={`w-full bg-transparent text-[14px] outline-none transition-colors
              ${editing === 'phone'
                ? 'text-text-primary'
                : 'text-text-muted cursor-default select-none'
              }`}
          />
          {editing === 'phone' && (
            <RowActions
              loading={saving === 'phone'}
              onSave={() => handleSave('phone')}
              onCancel={() => cancelEditing('phone')}
            />
          )}
        </FieldCard>

        <p className="text-[12px] text-text-muted px-1 leading-relaxed">
          Changing your email will send a confirmation to the new address.
          Your current email stays active until confirmed.
        </p>
      </div>
    </div>
  )
}

// ── FieldCard ──────────────────────────────────────────────────────────────

function FieldCard({
  icon,
  label,
  isEditing,
  successNote,
  onEdit,
  children,
}: {
  icon: string
  label: string
  isEditing: boolean
  successNote?: string
  onEdit: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className={`rounded-[22px] border transition-colors overflow-hidden
        ${isEditing ? 'border-brand bg-white' : 'border-border bg-white'}`}
    >
      {/* Label + edit pencil */}
      <div className="flex items-center justify-between px-4 pt-4 pb-1">
        <div className="flex items-center gap-2">
          <i className={`ti ${icon} text-[16px] ${isEditing ? 'text-brand' : 'text-text-muted'} transition-colors`} />
          <span className="text-[11px] font-bold font-nunito text-text-muted uppercase tracking-wide">
            {label}
          </span>
        </div>
        {!isEditing && (
          <button
            onClick={onEdit}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-brand-pale transition-colors"
          >
            <i className="ti ti-pencil text-[14px] text-text-muted" />
          </button>
        )}
      </div>

      {/* Input row */}
      <div className="flex items-center gap-2 px-4 pb-4 pt-1">
        {children}
      </div>

      {/* Success note */}
      {successNote && (
        <div className="flex items-center gap-2 px-4 pb-3 -mt-1">
          <i className="ti ti-circle-check text-[15px] text-green-500" />
          <p className="text-[12px] text-green-600">{successNote}</p>
        </div>
      )}
    </div>
  )
}

// ── RowActions ─────────────────────────────────────────────────────────────

function RowActions({
  loading,
  onSave,
  onCancel,
}: {
  loading: boolean
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={onCancel}
        className="w-8 h-8 flex items-center justify-center rounded-full border border-border text-text-muted hover:bg-border transition-colors"
      >
        <i className="ti ti-x text-[14px]" />
      </button>
      <button
        onClick={onSave}
        disabled={loading}
        className="h-8 px-4 rounded-full bg-brand text-white text-[13px] font-bold font-nunito disabled:opacity-50 transition-opacity"
      >
        {loading
          ? <i className="ti ti-loader-2 text-[14px] animate-spin" />
          : 'Save'
        }
      </button>
    </div>
  )
}