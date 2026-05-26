import { useState, useEffect } from 'react'
import type { GroomingStyle } from '@/types'

export function useStyles(language: string, t: any) {
  const [styles, setStyles] = useState<GroomingStyle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStyles() {
      try {
        const res = await fetch('/api/styles')
        const json = await res.json()

        // merge DB data with translations
            const merged = json.styles.map((style: any) => ({
        ...style,
        name:     language === 'ko' ? style.name_kor     : style.name_eng,
        desc:     language === 'ko' ? style.desc_kor     : style.desc_eng
        }))

        setStyles(merged)
      } catch (err) {
        setError('Failed to load styles')
      } finally {
        setLoading(false)
      }
    }

    fetchStyles()
  }, [language]) // refetch when language changes so names update

  return { styles, loading, error }
}     