'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/LanguageContext'

const NAV_ITEMS = [
  { href: '/',       icon: 'ti-home',     labelKey: 'home'    },
  { href: '/book',   icon: 'ti-calendar', labelKey: 'book'    },
  { href: '/account',icon: 'ti-user',     labelKey: 'account' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { language } = useLanguage()

  const labels = {
    en: { home: 'Home', book: 'Book', account: 'Account' },
    ko: { home: '홈', book: '예약', account: '계정' },
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-white py-2.5 md:hidden">
      {NAV_ITEMS.map(({ href, icon, labelKey }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 text-[10px] font-semibold transition-colors',
              active ? 'text-brand' : 'text-text-muted',
            )}
          >
            <i className={cn('ti text-[22px]', icon)} aria-hidden="true" />
            <span>{labels[language][labelKey as keyof typeof labels['en']]}</span>
          </Link>
        )
      })}
    </nav>
  )
}
