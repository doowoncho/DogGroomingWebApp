'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/',       icon: 'ti-home',           label: 'Home'    },
  { href: '/book',   icon: 'ti-calendar',        label: 'Book'    },
  { href: '/account',icon: 'ti-user',            label: 'Account' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-white pt-2.5 pb-4 md:hidden">
      {NAV_ITEMS.map(({ href, icon, label }) => {
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
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
