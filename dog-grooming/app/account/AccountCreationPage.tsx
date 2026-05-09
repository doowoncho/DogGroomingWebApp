import { useState } from 'react'
import type { BookingDraft } from '@/types'
import Link from 'next/link'

// ─── Account creation page ───────────────────────────────────────────────────
export default function AccountCreationPage({ 
  draft, 
  onComplete 
}: { 
  draft: BookingDraft
  onComplete: () => void 
}) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const canCreate = draft.email && password && password === confirmPassword

  const handleCreateAccount = async () => {
    if (!canCreate) return
    // TODO: wire up account creation API
    // e.g. await createAccount({ email: draft.email, password })
    onComplete()
  }

  return (
    <div className="flex flex-col px-5 py-8">
      <h2 className="font-nunito font-extrabold text-2xl text-text-primary mb-2">
        Create your account
      </h2>
      
      <p className="text-text-secondary text-[14px] mb-6">
        Save your bookings and manage them easily.
      </p>

      {/* Email (pre-filled) */}
      <div className="mb-4">
        <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wide mb-1.5">
          Email
        </label>
        <input
          type="email"
          value={draft.email}
          disabled
          className="w-full px-4 py-3 border border-border rounded-[14px] text-[14px] font-nunito-sans text-text-muted bg-surface outline-none cursor-not-allowed"
        />
        <p className="text-[11px] text-text-muted mt-1">Uses your booking email</p>
      </div>

      {/* Password */}
      <div className="mb-4">
        <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wide mb-1.5">
          Password
        </label>
        <input
          type="password"
          placeholder="Enter Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 border border-border rounded-[14px] text-[14px] font-nunito-sans text-text-primary bg-white outline-none focus:border-brand"
        />
      </div>

      {/* Confirm Password */}
      <div className="mb-6">
        <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wide mb-1.5">
          Confirm password
        </label>
        <input
          type="password"
          placeholder="Confirm your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-4 py-3 border border-border rounded-[14px] text-[14px] font-nunito-sans text-text-primary bg-white outline-none focus:border-brand"
        />
        {password && confirmPassword && password !== confirmPassword && (
          <p className="text-[11px] text-red-500 mt-1">Passwords don't match</p>
        )}
      </div>

      <button
        disabled={!canCreate}
        onClick={handleCreateAccount}
        className="w-full bg-brand text-white font-nunito font-bold text-base rounded-full py-4 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity active:opacity-80 mb-3"
      >
        Create account
      </button>

      <Link
        href="/"
        className="w-full bg-white text-brand font-nunito font-bold text-base rounded-full py-4 border-2 border-brand flex items-center justify-center transition-opacity active:opacity-80"
      >
        Skip for now
      </Link>
    </div>
  )
}