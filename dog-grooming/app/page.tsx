'use client'

import Link from 'next/link'
import { SERVICES } from '@/lib/data'
import { useLanguage } from '@/components/LanguageContext'
import { translations } from '@/lib/translations'

const PHOTOS = [
  { name: 'Charlie',   breed: 'Golden Retriever', bg: 'from-[#ffd89b] to-[#ff8c42]'  },
  { name: 'Biscuit', breed: 'Labrador',          bg: 'from-[#d4ecd4] to-[#7bc47b]'  },
  { name: 'Coco',    breed: 'Poodle',            bg: 'from-[#ddd6f3] to-[#a18cd1]'  },
  { name: 'Daisy',   breed: 'Shih Tzu',          bg: 'from-[#fbc2eb] to-[#e2789e]'  },
]

const TRUST = [
  { icon: 'ti-certificate', labelKey: 'Korean Certified groomer' },
  { icon: 'ti-home-heart',  labelKey: 'Cage-free salon'    },
  { icon: 'ti-star',        labelKey: '5★ on Google'       },
]

const REVIEWS = [
  {
    initials: 'SK',
    name: 'Sarah K.',
    breed: 'Golden Retriever owner',
    text: '"Dog came home looking absolutely incredible. Kiin is so gentle and professional — we\'ll never go anywhere else."',
    avatarBg: 'bg-brand-pale',
    avatarText: 'text-brand',
  },
  {
    initials: 'JL',
    name: 'James L.',
    breed: 'Labrador owner',
    text: '"Booked in 30 seconds and Biscuit was done in an hour. Best grooming experience we\'ve had in Calgary."',
    avatarBg: 'bg-[#eaf3de]',
    avatarText: 'text-[#3B6D11]',
  },
]

export default function HomePage() {
  const { language } = useLanguage()
  const t = translations[language]

  return (
    <div>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Greeting */}
        <div className="px-5 pt-1">
          <p className="text-[13px] text-text-muted font-semibold">
            {language === 'en' ? 'At-Home grooming salon' : '홈 그루밍 살롱'}
          </p>
          <h2 className="font-nunito font-extrabold text-xl text-text-primary mt-0.5">
            {language === 'en' ? 'Private grooming for a calmer experience' : '더 편안한 경험을 위한 프라이빗 그루밍'}
          </h2>
        </div>

        {/* Hero banner */}
        <div className="mx-5 mt-5 rounded-[20px] bg-gradient-to-r from-brand to-brand-light p-7 flex items-center justify-between">
          <div>
            <h3 className="font-nunito font-extrabold text-xl text-white leading-tight mb-4">
              {language === 'en' 
                ? 'Book your first\nsession today'
                : '오늘 첫 세션을\n예약하세요'
              }
            </h3>
            <Link
              href="/book"
              className="bg-white text-brand font-nunito font-bold text-[14px] px-4 py-3 rounded-full inline-block"
            >
              {t.home.bookNow}
            </Link>
          </div>
          <div className="w-30 h-30 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <i className="ti ti-dog-bowl text-[50px] text-white" aria-hidden="true" />
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
        </div>
        <div className="grid grid-cols-3 gap-2.5 px-5">
          {TRUST.map(({ icon, labelKey }) => (
            <div key={labelKey} className="bg-white rounded-[16px] p-3.5 text-center border border-border">
              <i className={`ti ${icon} text-[24px] text-brand block mb-1.5`} aria-hidden="true" />
              <p className="text-[11px] font-bold text-text-primary leading-tight">
                {language === 'en'
                  ? labelKey
                  : labelKey === 'Korean Certified groomer'
                  ? '한국 공인 그루머'
                  : labelKey === 'Cage-free salon'
                  ? '케이지 없는 살롱'
                  : 'Google 5★'}
              </p>
            </div>
          ))}
        </div>

        <div className="h-5" />
      </div>
    </div>
  )
}