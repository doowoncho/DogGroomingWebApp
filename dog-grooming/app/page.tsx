'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/components/LanguageContext'
import { translations } from '@/lib/translations'
import BreedAutoComplete from '@/components/ui/BreedAutoComplete'
import { getRawServices } from '@/lib/hooks/useServices'

const DOG_SIZES = [
  { value: 'S', label: 'S', lbs: '0–25 lbs', kg: '0–11 kg' },
  { value: 'M', label: 'M', lbs: '25–60 lbs', kg: '11–27 kg' },
  { value: 'L', label: 'L', lbs: '60+ lbs', kg: '27+ kg' },
] as const

type DogSize = typeof DOG_SIZES[number]['value']

export default function HomePage() {
  const { language } = useLanguage()
  const t = translations[language]
  const router = useRouter()

  const [dogName, setDogName] = useState('')
  const [size, setSize] = useState<DogSize | null>(null)
  const [breed, setBreed] = useState('')
  const [nameFocused, setNameFocused] = useState(false)
  const [breedFocused, setBreedFocused] = useState(false)

  useEffect(() => {
    // Reset breed when size changes
    getRawServices()
  }, [])

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
    <div className="page-full-bleed relative min-h-full flex flex-col">
    <div className="flex-1 flex max-w-6xl mx-auto px-4 sm:px-8 lg:px-16 w-full">
        <div className="relative w-full flex flex-col sm:block before:content-[''] before:flex-1 after:content-[''] after:flex-[2] sm:before:hidden sm:after:hidden lg:my-15 sm:my-10 mt-2 mb-3">
          <div className="relative w-full rounded-[24px] bg-white border border-black/[0.06] shadow-[0_20px_45px_-20px_rgba(0,0,0,0.18)] sm:min-h-[580px] max-w-[530px] mx-auto">
            {/* ...card content unchanged... */}
            <div className="px-5 pt-7 pb-6 sm:p-10">
              <h3
                className="text-center font-nunito font-extrabold text-[24px] text-text-primary mb-1"
              >
                {language === 'en'
                  ? 'Book your first session'
                  : '오늘 첫 세션을 예약하세요'}
              </h3>
              <p className="text-center text-[15px] text-text-muted mb-7">
                {language === 'en' ? 'Takes less than a minute' : '1분이면 충분해요'}
              </p>

              <div className="space-y-5">
                {/* Dog name */}
                <div>
                  <label
                    htmlFor="dogName"
                    className="block text-[12px] font-bold text-text-muted mb-2 tracking-wide uppercase"
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
                    autoComplete="off"
                    autoCapitalize="words"
                    enterKeyHint="next"
                    placeholder={language === 'en' ? 'e.g. Curi' : '예: 큐리'}
                    className="w-full rounded-[14px] border-[1.5px] border-black/[0.08] bg-surface-secondary px-4 py-4 text-base font-medium text-text-primary outline-none transition-colors focus:border-brand focus:bg-white placeholder:text-black/30"
                  />
                </div>

                {/* Dog size */}
                <div>
                  <p className="text-[12px] font-bold text-text-muted mb-2 tracking-wide uppercase">
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
                          aria-pressed={selected}
                          className={`flex flex-col items-center rounded-[16px] px-2 py-4 active:scale-[0.97] text-center border-[1.5px] transition-colors ${
                            selected
                              ? 'bg-brand border-brand'
                              : 'bg-surface-secondary border-black/[0.08] hover:border-brand/40'
                          }`}
                        >
                          <i
                            className={`ti ti-paw text-[22px] mb-1.5 ${selected ? 'text-white' : 'text-text-primary/70'}`}
                            aria-hidden="true"
                          />
                          <div className={`font-extrabold text-[18px] ${selected ? 'text-white' : 'text-text-primary'}`}
                               style={{ fontFamily: 'var(--font-fraunces, serif)' }}>
                            {s.label}
                          </div>
                          <div className={`text-[12px] font-medium leading-snug ${selected ? 'text-white/80' : 'text-text-muted'}`}>
                            {s.lbs}<br />{s.kg}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Breed — optional */}  
                <BreedAutoComplete 
                  breed={breed}
                  onChange={(e) => setBreed(e)}
                  t={t}
                  variant='muted'
                  optionalTag={true}
                />
               

                {/* Submit */}
                <button
                  type="button"
                  onClick={handleBook}
                  disabled={!isValid}
                  className={`w-full font-nunito font-bold text-[17px] tracking-wide px-4 py-[18px] rounded-full transition-all ${
                    isValid
                      ? 'bg-brand text-white shadow-[0_10px_24px_-10px_rgba(0,0,0,0.35)] hover:brightness-95 active:scale-[0.99]'
                      : 'bg-[#EFE9DC] text-[#B3AC9C] cursor-not-allowed'
                  }`}
                >
                  {t.home.bookNow}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  )
}