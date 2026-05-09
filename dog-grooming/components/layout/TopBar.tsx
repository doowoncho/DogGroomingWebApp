import Link from 'next/link'

interface TopBarProps {
  showBack?: boolean
  backHref?: string
  title?: string
}

export default function TopBar({ showBack, backHref = '/', title }: TopBarProps) {
  return (
    <header className="flex items-center justify-between px-5 pt-4 pb-5 md:px-8">
      <div className="flex items-center gap-3">
        {showBack ? (
          <Link
            href={backHref}
            className="w-9 h-9 rounded-full bg-surface-secondary flex items-center justify-center"
            aria-label="Go back"
          >
            <i className="ti ti-arrow-left text-[18px] text-text-secondary" aria-hidden="true" />
          </Link>
        ) : (
          <span className="w-9 h-9 rounded-full bg-surface-secondary flex items-center justify-center">
            <Link
            href={backHref}
            className="w-9 h-9 rounded-full bg-surface-secondary flex items-center justify-center"
            aria-label="Go back"
          >
            <i className="ti ti-dog text-[18px] text-text-secondary" aria-hidden="true" />
          </Link>
          </span>
        )}

        {title ? (
          <span className="font-nunito font-extrabold text-xl text-text-primary">{title}</span>
        ) : (
          <span className="font-nunito font-extrabold text-[22px] text-text-primary">
            Kiin's<span className="text-brand"> pet grooming</span>
          </span>
        )}
      </div>

      <div className="hidden items-center gap-8 md:flex">
        <Link href="/" className="text-[13px] font-semibold text-text-secondary transition hover:text-text-primary">
          Home
        </Link>
        <Link href="/book" className="text-[13px] font-semibold text-text-secondary transition hover:text-text-primary">
          Book
        </Link>
        <Link href="/account" className="text-[13px] font-semibold text-text-secondary transition hover:text-text-primary">
          Account
        </Link>
      </div>

      <Link
        href="/account"
        className="w-9 h-9 rounded-full bg-brand-light flex items-center justify-center font-nunito font-bold text-sm text-white md:hidden"
        aria-label="Account"
      >
        A
      </Link>
    </header>
  )
}