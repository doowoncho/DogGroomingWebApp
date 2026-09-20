import { useState, useEffect, useMemo } from 'react'
import type { Service } from '@/types'

let servicesCache: any[] | null = null       // module-level cache, survives remounts
let servicesPromise: Promise<any[]> | null = null

export async function getRawServices(): Promise<any[]> {
  if (servicesCache) return servicesCache
  if (!servicesPromise) {
    servicesPromise = fetch('/api/services')
      .then((res) => res.json())
      .then((json) => {
        servicesCache = json.services
        return json.services
      })
  }
  return servicesPromise
}

export function useServices(language: string, size?: string | null) {
  const [rawServices, setRawServices] = useState<any[]>(servicesCache ?? [])
  const [loading, setLoading] = useState(!servicesCache)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getRawServices()
      .then((data) => {
        if (!cancelled) setRawServices(data)
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load services')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, []) // ← fetch exactly once, regardless of language/size

  // language/size changes just re-run this cheap local map — no network
  const services: Service[] = useMemo(
    () =>
      rawServices.map((svc: any) => ({
        ...svc,
        name: language === 'ko' ? svc.name_kor : svc.name_eng,
        description: language === 'ko' ? svc.desc_kor : svc.desc_eng,
        price:
          size === 'S' ? svc.sm_price :
          size === 'M' ? svc.md_price :
          size === 'L' ? svc.lg_price :
          null,
      })),
    [rawServices, language, size],
  )

  const serviceMap = useMemo(
    () => Object.fromEntries(services.map((s) => [s.id, s.name])),
    [services],
  )

  return { services, serviceMap, loading, error }
}