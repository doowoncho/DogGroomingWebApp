'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/components/LanguageContext'
import { translations } from '@/lib/translations'
import { useServices } from '@/lib/hooks/useServices'

type BookingStatus = 'upcoming' | 'completed'

type Booking = {
  id: number
  service_id: number
  date: string
  time: string
  dog_name: string
  phone: string
  email: string
  breed: string
  status: BookingStatus
}

export default function BookingHistoryPage() {
  const { language } = useLanguage()
  const t = translations[language]
  const { services } = useServices(language)

  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await fetch('/api/bookings')
        if (!res.ok) throw new Error('Failed to fetch bookings')
        const data = await res.json()
        setBookings(data.bookings)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    fetchBookings()
  }, [])

  const getServiceName = (serviceId: number) =>
    services.find((s) => s.id === serviceId)?.name ?? '—'

  return (
    <div>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="px-5 pt-5">
          <Link
            href="/account"
            className="inline-flex items-center gap-1.5 text-[13px] font-bold text-text-secondary"
          >
            <i className="ti ti-chevron-left text-[16px]" />
            {t.common.back}
          </Link>

          <h1 className="mt-3 font-nunito font-extrabold text-[24px] text-text-primary">
            {t.bookingHistory.title}
          </h1>

          <p className="text-[13px] text-text-muted mt-1">
            {t.bookingHistory.subtitle}
          </p>
        </div>

        <div className="px-5 pt-5 space-y-3">
          {loading ? (
            <p className="text-[13px] text-text-muted">Loading...</p>
          ) : error ? (
            <p className="text-[13px] text-red-500">{error}</p>
          ) : bookings.length === 0 ? (
            <p className="text-[13px] text-text-muted">No bookings found.</p>
          ) : (
            bookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white border border-border rounded-[22px] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-nunito font-extrabold text-[16px] text-text-primary">
                      {getServiceName(booking.service_id)}
                    </p>
                    <p className="mt-1 text-[13px] text-text-secondary">
                      {booking.dog_name}
                    </p>
                  </div>

                  <div
                    className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                      booking.status === 'upcoming'
                        ? 'bg-brand-pale text-brand'
                        : 'bg-surface-secondary text-text-secondary'
                    }`}
                  >
                    {t.bookingHistory.status[booking.status]}
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4 text-[13px] text-text-secondary">
                  <div className="flex items-center gap-1.5">
                    <i className="ti ti-calendar" />
                    {booking.date}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <i className="ti ti-clock" />
                    {booking.time}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="h-8" />
      </div>
    </div>
  )
}