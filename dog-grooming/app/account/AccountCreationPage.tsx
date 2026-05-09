import { useState } from 'react'
import type { BookingDraft } from '@/types'
import Link from 'next/link'
import { useLanguage } from '@/components/LanguageContext'
import { translations } from '@/lib/translations'

export default function AccountCreationPage({ 
  draft, 
  onComplete 
}: { 
  draft: BookingDraft
  onComplete: () => void 
}) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const { language } = useLanguage()
  const t = translations[language]

  const canCreate = draft.email && password && password === confirmPassword

  const handleCreateAccount = async () => {
    if (!canCreate) return
    onComplete()
  }

  return (
    <div className="flex flex-col px-5 py-8">
      <h2 className="font-nunito font-extrabold text-2xl text-text-primary mb-2">
        {t.booking.createYourAccount}
      </h2>
      
      <p className="text-text-secondary text-[14px] mb-6">
        {t.booking.saveBookings}
      </p>

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