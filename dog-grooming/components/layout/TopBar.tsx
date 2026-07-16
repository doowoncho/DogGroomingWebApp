'use client'

import Link from 'next/link'
import { useLanguage } from '@/components/LanguageContext'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/utils/supabase/client'

interface TopBarProps {
  showBack?: boolean
  backHref?: string
  title?: string
}

export default function TopBar({ showBack, backHref = '/', title }: TopBarProps) {
  const { language, setLanguage } = useLanguage()
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

useEffect(() => {
  const loadUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    setUser(user)

    if (user) {
      try {
        const res = await fetch('/api/profile')

        if (res.ok) {
          const profile = await res.json()
          setIsAdmin(profile?.is_admin === true)
        }
      } catch (err) {
        console.error(err)
      }
    }
  }

  loadUser()

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (_event, session) => {
    setUser(session?.user ?? null)

    if (session?.user) {
      try {
        const res = await fetch('/api/profile')

        if (res.ok) {
          const profile = await res.json()
          setIsAdmin(profile?.is_admin === true)
        }
      } catch (err) {
        console.error(err)
      }
    } else {
      setIsAdmin(false)
    }
  })

  return () => {
    subscription.unsubscribe()
  }
}, [])

  return (
    <header className="px-5 pt-4 pb-5">
      <div className="mx-auto flex max-w-[850px] items-center justify-between">
      <div className="flex items-center gap-3">
        
        {isAdmin && (
  <Link
    href="/admin"
    className="text-[13px] font-semibold text-brand transition hover:opacity-80"
  >
    Admin
  </Link>
)}
        {showBack ? (
          <Link
            href={backHref}
            className="w-9 h-9 rounded-full bg-surface-secondary flex items-center justify-center"
            aria-label="Go back"
          >
            <i className="ti ti-arrow-left text-[18px] text-text-secondary" aria-hidden="true" />
          </Link>
        ) : (
          <span className="w-9 h-9 rounded-full bg-surface-secondary flex items-center justify-center">
            <Link
            href="/"
            className="w-9 h-9 rounded-full bg-surface-secondary flex items-center justify-center"
            aria-label="Home"
          >
            <i className="ti ti-dog text-[18px] text-text-secondary" aria-hidden="true" />
          </Link>
          </span>
        )}

        {title ? (
          <span className="font-nunito font-extrabold text-xl text-text-primary">{title}</span>
        ) : (
          <span className="font-nunito font-extrabold text-[22px] text-text-primary">
            Mung Mung<span className="text-brand"> Grooming</span>
          </span>
        )}
      </div>

      <div className="hidden items-center gap-8 md:flex">
        <div className="flex items-center gap-2 pl-4 border-l border-border">
          <button
            onClick={() => setLanguage('en')}
            className={`text-[12px] font-bold px-2 py-1 rounded transition ${
              language === 'en'
                ? 'bg-brand text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('ko')}
            className={`text-[12px] font-bold px-2 py-1 rounded transition ${
              language === 'ko'
                ? 'bg-brand text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            한
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 md:hidden">
        <button
          onClick={() => setLanguage(language === 'en' ? 'ko' : 'en')}
          className="text-[11px] font-bold px-2 py-1.5 rounded bg-surface-secondary text-text-secondary"
        >
          {language === 'en' ? 'EN' : '한'}
        </button>
        {/* {user ? (
          <Link
            href="/account"
            className="w-9 h-9 rounded-full bg-brand-light flex items-center justify-center font-nunito font-bold text-sm text-white"
          >
            A
          </Link>
        ) : (
          <Link
            href="/login"
            className="w-9 h-9 rounded-full bg-surface-secondary flex items-center justify-center font-nunito font-bold text-sm text-text-secondary"
          >
            <i className="ti ti-login text-[16px]" />
          </Link>
        )} */}
      </div>

      </div>
    </header>
  )
}