import { useState, useEffect, useMemo } from 'react'
import type { Service } from '@/types'

export function useServices(language: string) {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchServices() {
      try {
        const res = await fetch('/api/services')
        const json = await res.json()

        const merged = json.services.map((svc: any) => ({
          ...svc,
          name: language === 'ko'
            ? svc.name_kor
            : svc.name_eng,
        }))

        setServices(merged)
      } catch {
        setError('Failed to load services')
      } finally {
        setLoading(false)
      }
    }

    fetchServices()
  }, [language])

  // id → service lookup
  const serviceMap = useMemo(
    () =>
      Object.fromEntries(
        services.map(s => [s.id, s.name])
      ),
    [services]
  )

  return {
    services,
    serviceMap,
    loading,
    error,
  }
}