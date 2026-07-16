'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/components/LanguageContext'
import { translations } from '@/lib/translations'

const DOG_SIZES = [
  { value: 'S', label: 'S', lbs: '0–25 lbs', kg: '0–11 kg' },
  { value: 'M', label: 'M', lbs: '25–60 lbs', kg: '11–27 kg' },
  { value: 'L', label: 'L', lbs: '60+ lbs', kg: '27+ kg' },
] as const

type DogSize = typeof DOG_SIZES[number]['value']

export default function HomePage() {
  const { language, setLanguage } = useLanguage()
  const t = translations[language]
  const router = useRouter()

  const [dogName, setDogName] = useState('')
  const [size, setSize] = useState<DogSize | null>(null)
  const [breed, setBreed] = useState('')
  const [nameFocused, setNameFocused] = useState(false)
  const [breedFocused, setBreedFocused] = useState(false)

  const isValid = dogName.trim().length > 0 && size !== null

  const handleBook = () => {
    if (!isValid) return
    const params = new URLSearchParams({
      dogName: dogName.trim(),
      size: size as DogSize,
      ...(breed.trim() ? { breed: breed.trim() } : {}),
    })
    router.push(`/book?${params.toString()}`)
  }

  const nameActive = nameFocused || dogName.length > 0
  const breedActive = breedFocused || breed.length > 0

  return (
    <div className="page-full-bleed relative">
      {/* Main two-column layout */}
      <div className="relative max-w-6xl mx-auto px-8 lg:px-16 lg:pt-13 pb-20 grid grid-cols-1 lg:grid-cols-2 lg:gap-16 items-center">
        {/* Left column — pitch */}
        <div className="my-2">
          <p className="text-[11px] font-bold tracking-[0.09em] uppercase text-brand mb-5 flex items-center gap-2 hidden md:block">
            <span className="w-[14px] h-px bg-brand inline-block" />
            One dog at a time
          </p>

          <h1
            className="font-extrabold text-text-primary leading-[1.1] mb-6"
            style={{
              fontFamily: 'var(--font-fraunces, serif)',
              fontSize: 'clamp(34px, 4.6vw, 52px)',
            }}
          >
            {language === 'en' ? (
              <>A calmer, more <span className="text-brand italic font-medium">private</span> way to get groomed.</>
            ) : (
              <>더 <span className="text-brand italic font-medium">편안한</span>, 프라이빗한 그루밍 경험.</>
            )}
          </h1>

          <p className="text-[15px] text-text-muted leading-relaxed mb-7 max-w-md hidden md:block">
            {language === 'en'
              ? 'Just your dog, a quiet room, and undivided attention from start to finish.'
              : '조용한 공간에서 반려견에게 처음부터 끝까지 온전한 관심을 드립니다.'}
          </p>

          <div className="inline-flex items-center gap-1.5 bg-white px-4 py-2 rounded-full border border-black/[0.06] shadow-sm">
            <i className="ti ti-map-pin text-[14px] text-brand" aria-hidden="true" />
            <p className="text-[13px] text-brand font-bold">
              Tuscany, NW Calgary
            </p>
          </div>
        </div>

        {/* Right column — booking card */}
        <div className="relative">
          <div className="relative rounded-[24px] bg-white border border-black/[0.06] shadow-[0_20px_45px_-20px_rgba(0,0,0,0.18)] overflow-hidden max-w-md ml-auto">
            <div className="p-8">
              <h3
                className="text-center font-bold text-[22px] text-text-primary mb-1"
              >
                {language === 'en'
                  ? 'Book your first session'
                  : '오늘 첫 세션을 예약하세요'}
              </h3>
              <p className="text-center text-[13px] text-text-muted mb-7">
                {language === 'en' ? 'Takes less than a minute' : '1분이면 충분해요'}
              </p>

              <div className="space-y-5">
                {/* Dog name */}
                <div>
                  <label
                    htmlFor="dogName"
                    className="block text-[11px] font-bold text-text-muted mb-2 tracking-wide uppercase"
                  >
                    {language === 'en' ? "Dog's name" : '반려견 이름'}
                  </label>
                  <input
                    id="dogName"
                    type="text"
                    value={dogName}
                    onFocus={() => setNameFocused(true)}
                    onBlur={() => setNameFocused(false)}
                    onChange={(e) => setDogName(e.target.value)}
                    placeholder={language === 'en' ? 'e.g. Mochi' : '예: 모찌'}
                    className="w-full rounded-[14px] border-[1.5px] border-black/[0.08] bg-surface-secondary px-4 py-3.5 text-[14px] font-medium text-text-primary outline-none transition-colors focus:border-brand focus:bg-white placeholder:text-black/30"
                  />
                </div>

                {/* Dog size */}
                <div>
                  <p className="text-[11px] font-bold text-text-muted mb-2 tracking-wide uppercase">
                    {language === 'en' ? 'Size' : '크기'}
                  </p>
                  <div className="grid grid-cols-3 gap-2.5">
                    {DOG_SIZES.map((s) => {
                      const selected = size === s.value
                      return (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setSize(s.value)}
                          className={`flex flex-col items-center rounded-[14px] px-2 py-4 text-center border-[1.5px] transition-colors ${
                            selected
                              ? 'bg-brand border-brand'
                              : 'bg-surface-secondary border-black/[0.08] hover:border-brand/40'
                          }`}
                        >
                          <i
                            className={`ti ti-paw text-[20px] mb-1.5 ${selected ? 'text-white' : 'text-text-primary/70'}`}
                            aria-hidden="true"
                          />
                          <div className={`font-extrabold text-[16px] ${selected ? 'text-white' : 'text-text-primary'}`}
                               style={{ fontFamily: 'var(--font-fraunces, serif)' }}>
                            {s.label}
                          </div>
                          <div className={`text-[10px] font-medium leading-snug ${selected ? 'text-white/80' : 'text-text-muted'}`}>
                            {s.lbs}<br />{s.kg}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Breed — optional */}
                <div>
                  <label
                    htmlFor="breed"
                    className="block text-[11px] font-bold text-text-muted mb-2 tracking-wide uppercase"
                  >
                    {language === 'en' ? 'Breed (optional)' : '견종 (선택)'}
                  </label>
                  <input
                    id="breed"
                    type="text"
                    value={breed}
                    onFocus={() => setBreedFocused(true)}
                    onBlur={() => setBreedFocused(false)}
                    onChange={(e) => setBreed(e.target.value)}
                    placeholder={language === 'en' ? 'e.g. Golden retriever' : '예: 골든 리트리버'}
                    className="w-full rounded-[14px] border-[1.5px] border-black/[0.08] bg-surface-secondary px-4 py-3.5 text-[14px] font-medium text-text-primary outline-none transition-colors focus:border-brand focus:bg-white placeholder:text-black/30"
                  />
                </div>

                {/* Submit */}
                <button
                  type="button"
                  onClick={handleBook}
                  disabled={!isValid}
                  className={`w-full font-bold text-[14px] tracking-wide px-4 py-4 rounded-full transition-all ${
                    isValid
                      ? 'bg-brand text-white shadow-[0_10px_24px_-10px_rgba(0,0,0,0.35)] hover:brightness-95 active:scale-[0.99]'
                      : 'bg-[#EFE9DC] text-[#B3AC9C] cursor-not-allowed'
                  }`}
                >
                  {t.home.bookNow}
                </button>

                <p className="text-center text-[11.5px] text-text-muted">
                  {language === 'en'
                    ? "We'll confirm your time by text within an hour"
                    : '1시간 이내에 문자로 예약을 확정해 드려요'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}