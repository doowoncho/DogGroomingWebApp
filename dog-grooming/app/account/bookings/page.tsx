import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import Link from 'next/link'

const BOOKINGS = [
  {
    id: 1,
    pet: 'Curi',
    service: 'Full Groom',
    date: 'May 18, 2026',
    time: '1:00 PM',
    status: 'Upcoming',
  },
  {
    id: 2,
    pet: 'Blue',
    service: 'Bath & Brush',
    date: 'April 12, 2026',
    time: '11:30 AM',
    status: 'Completed',
  },
]

export default function BookingHistoryPage() {
  return (
    <div className="app-shell flex flex-col h-dvh bg-surface">
      <TopBar />

      <div className="flex-1 overflow-y-auto no-scrollbar">
       <div className="px-5 pt-5">
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 text-[13px] font-bold text-text-secondary"
        >
          <i className="ti ti-chevron-left text-[16px]" />
          Back
        </Link>

        <h1 className="mt-3 font-nunito font-extrabold text-[24px] text-text-primary">
          Booking history
        </h1>

        <p className="text-[13px] text-text-muted mt-1">
          View upcoming and previous appointments.
        </p>
      </div>

        <div className="px-5 pt-5 space-y-3">
          {BOOKINGS.map((booking) => (
            <div
              key={booking.id}
              className="bg-white border border-border rounded-[22px] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-nunito font-extrabold text-[16px] text-text-primary">
                    {booking.service}
                  </p>

                  <p className="mt-1 text-[13px] text-text-secondary">
                    {booking.pet}
                  </p>
                </div>

                <div
                  className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                    booking.status === 'Upcoming'
                      ? 'bg-brand-pale text-brand'
                      : 'bg-surface-secondary text-text-secondary'
                  }`}
                >
                  {booking.status}
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
          ))}
        </div>

        <div className="h-8" />
      </div>

      <BottomNav />
    </div>
  )
}