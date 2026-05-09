import Link from 'next/link'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'

const MENU_ITEMS = [
  { icon: 'ti-dog',      label: 'My pets',         href: '/account/pets' },
  { icon: 'ti-calendar', label: 'Booking history', href: '/account/bookings' },
  // { icon: 'ti-lock',     label: 'Change password', href: '/account/password' },
]

export default function AccountPage() {
  return (
    <div className="app-shell flex flex-col h-dvh">
      <TopBar />
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Profile header */}
        <div className="flex items-center gap-3.5 px-5 pt-5 pb-5">
          <div className="w-14 h-14 rounded-full bg-brand-pale flex items-center justify-center font-nunito font-extrabold text-xl text-brand flex-shrink-0">
            A
          </div>
          <div>
            <p className="font-nunito font-bold text-[17px] text-text-primary">Alex Johnson</p>
            <p className="text-[13px] text-text-muted">alex@example.com</p>
          </div>
        </div>

        {/* Menu */}
        <div className="px-10">
          {MENU_ITEMS.map(({ icon, label, href }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-3.5 w-full py-3.5 border-b border-border last:border-none"
            >
              <i className={`ti ${icon} text-[20px] text-text-secondary w-6`} aria-hidden="true" />
              <span className="flex-1 text-[14px] text-text-primary text-left">{label}</span>
              <i className="ti ti-chevron-right text-[16px] text-text-muted" aria-hidden="true" />
            </Link>
          ))}
        </div>

        {/* Sign out */}
        <div className="px-5 pt-6">
          <Link
            href="/"
            className="w-full border border-border rounded-full py-3.5 text-[14px] font-bold font-nunito text-text-secondary text-center block"
          >
            Sign out
          </Link>
        </div>
        <div className="h-6" />
      </div>
      <BottomNav />
    </div>
  )
}
