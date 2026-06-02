'use client'

import Link from 'next/link'
import { useLanguage } from '@/components/LanguageContext'
import { translations } from '@/lib/translations'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function AccountPage() {
  const { language } = useLanguage()
  const t = translations[language]
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth.getUser().then(({ data }) => {
      if (mounted) {
        setUser(data.user)
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="px-5 py-10 text-text-muted text-sm">
        Loading...
      </div>
    )
  }

  if (!user) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="text-text-muted mb-4">You are not logged in</p>

        <Link
          href="/login"
          className="bg-brand text-white px-5 py-3 rounded-full font-bold"
        >
          Go to Login
        </Link>
      </div>
    )
  }

  const MENU_ITEMS = [
    { icon: 'ti-edit', label: 'Edit Contact Info', href: '/account/edit' },
    { icon: 'ti-dog', label: t.account.myPets, href: '/account/pets' },
    { icon: 'ti-calendar', label: t.account.bookingHistory, href: '/account/bookings' },
  ]

  const fullName =
    user.user_metadata?.full_name ||
    user.email?.split('@')[0] ||
    'User'

  const initial = fullName.charAt(0).toUpperCase()

  return (
    <div>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Profile */}
        <div className="flex items-center gap-3.5 px-5 pt-5 pb-5">
          <div className="w-14 h-14 rounded-full bg-brand-pale flex items-center justify-center font-nunito font-extrabold text-xl text-brand">
            {initial}
          </div>

          <div>
            <p className="font-nunito font-bold text-[17px] text-text-primary">
              {fullName}
            </p>
            <p className="text-[13px] text-text-muted">{user.email}</p>
          </div>
        </div>

        {/* Menu */}
        <div className="px-10">
          {MENU_ITEMS.map(({ icon, label, href }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3.5 w-full py-3.5 border-b border-border last:border-none"
            >
              <i className={`ti ${icon} text-[20px] text-text-secondary w-6`} />
              <span className="flex-1 text-[14px] text-text-primary">
                {label}
              </span>
              <i className="ti ti-chevron-right text-[16px] text-text-muted" />
            </Link>
          ))}
        </div>

        {/* Sign out */}
        <div className="px-5 pt-6">
          <button
            onClick={handleSignOut}
            className="w-full border border-border rounded-full py-3.5 text-[14px] font-bold font-nunito text-text-secondary"
          >
            {t.account.signOut}
          </button>
        </div>
      </div>
    </div>
  )
}