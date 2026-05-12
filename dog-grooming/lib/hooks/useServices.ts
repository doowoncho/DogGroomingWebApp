import { useState, useEffect } from 'react'
import type { Service } from '@/types'

export function useServices(language: string, t: any) {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchServices() {
      try {
        const res = await fetch('/api/services')
        const json = await res.json()

        // merge DB data with translations
            const merged = json.services.map((svc: any) => ({
        ...svc,
        name:     language === 'ko' ? svc.name_ko     : svc.name_en
        }))

        setServices(merged)
      } catch (err) {
        setError('Failed to load services')
      } finally {
        setLoading(false)
      }
    }

    fetchServices()
  }, [language]) // refetch when language changes so names update

  return { services, loading, error }
}