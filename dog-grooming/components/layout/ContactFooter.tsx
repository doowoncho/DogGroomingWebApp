'use client'

import { usePathname } from 'next/navigation'

const INSTAGRAM_URL = 'https://instagram.com/'
const KAKAOTALK_URL = 'https://pf.kakao.com/'
const CONTACT_EMAIL = 'mungmung.grooming@gmail.com'

// The booking flow pins its own action bar to the bottom of the screen.
const HIDDEN_ON = ['/book']

export default function ContactFooter() {
  const pathname = usePathname()
  if (HIDDEN_ON.some((p) => pathname?.startsWith(p))) return null

  return (
    <footer className="pb-safe pt-1 flex items-center justify-center gap-1 bg-surface">
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram"
        className="w-11 h-11 flex items-center justify-center rounded-full text-text-muted hover:text-brand active:bg-surface-secondary transition-colors"
      >
        <i className="ti ti-brand-instagram text-[22px]" aria-hidden="true" />
      </a>

      <a
        href={KAKAOTALK_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="KakaoTalk"
        className="w-11 h-11 flex items-center justify-center rounded-full text-text-muted hover:text-brand active:bg-surface-secondary transition-colors"
      >
        <i className="ti ti-brand-kako-talk text-[22px]" aria-hidden="true" />
      </a>

      <a
        href={`mailto:${CONTACT_EMAIL}`}
        className="flex h-11 min-w-0 items-center gap-1.5 rounded-full px-2 text-[14px] sm:text-[15px] font-semibold text-text-muted hover:text-brand active:bg-surface-secondary transition-colors"
      >
        <i className="ti ti-mail text-[22px] flex-shrink-0" aria-hidden="true" />
        <span className="truncate">{CONTACT_EMAIL}</span>
      </a>
    </footer>
  )
}
