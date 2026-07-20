'use client'

import { useLanguage } from '@/components/LanguageContext'

const INSTAGRAM_URL = 'https://instagram.com/'
const KAKAOTALK_URL = 'https://pf.kakao.com/'
const CONTACT_EMAIL = 'mungmung.grooming@gmail.com'

export default function ContactFooter() {
  const { language } = useLanguage()

  return (
    <div className="flex items-center justify-center gap-8 px-4 py-3.5 border-t border-border bg-white">

      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram"
        className="w-7 h-7 flex items-center justify-center text-text-muted hover:text-brand transition-colors"
      >
        <i className="ti ti-brand-instagram text-[25px]" aria-hidden="true" />
      </a>

      <a
        href={KAKAOTALK_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="KakaoTalk"
        className="w-7 h-7 flex items-center justify-center text-text-muted hover:text-brand transition-colors"
      >
        <i className="ti ti-brand-kako-talk text-[25px]" aria-hidden="true" />
      </a>

      <a
        href={`mailto:${CONTACT_EMAIL}`}
        className="flex items-center gap-1.5 text-[15px] font-semibold text-text-muted hover:text-brand transition-colors"
      >
        <i className="ti ti-mail text-[25px]" aria-hidden="true" />
        {CONTACT_EMAIL}
      </a>

    </div>
  )
}