'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  const pathname = usePathname()
  // The booking flow has its own header on phones (back + title + language).
  const hideOnMobile = pathname?.startsWith('/book') ?? false
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
    <header className={`${hideOnMobile ? 'hidden md:block' : ''} pt-safe px-4 pb-2 md:px-5 md:pt-4 md:pb-5 bg-surface`}>
      <div className="mx-auto flex max-w-[850px] items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {showBack ? (
            <Link
              href={backHref}
              className="w-11 h-11 rounded-full bg-surface-secondary flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
              aria-label="Go back"
            >
              <i className="ti ti-arrow-left text-[20px] text-text-secondary" aria-hidden="true" />
            </Link>
          ) : (
            <Link
              href="/"
              className="w-11 h-11 rounded-full bg-surface-secondary flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
              aria-label="Home"
            >
              <i className="ti ti-dog text-[20px] text-text-secondary" aria-hidden="true" />
            </Link>
          )}

          {title ? (
            <span className="truncate font-nunito font-extrabold text-xl text-text-primary">{title}</span>
          ) : (
            <span className="truncate font-nunito font-extrabold text-[20px] md:text-[22px] text-text-primary">
              Mung Mung<span className="text-brand"> Grooming</span>
            </span>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          {isAdmin && (
            <Link
              href="/admin"
              className="flex h-11 items-center px-2 text-[14px] font-semibold text-brand transition hover:opacity-80"
            >
              Admin
            </Link>
          )}

          <div className="hidden items-center gap-2 pl-4 border-l border-border md:flex">
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

          <button
            onClick={() => setLanguage(language === 'en' ? 'ko' : 'en')}
            aria-label={language === 'en' ? 'Switch to Korean' : 'Switch to English'}
            className="md:hidden h-11 min-w-11 px-3 rounded-full bg-surface-secondary text-[14px] font-bold text-text-secondary active:scale-95 transition-transform"
          >
            {language === 'en' ? 'EN' : '한'}
          </button>
        </div>
      </div>
    </header>
  )
}
