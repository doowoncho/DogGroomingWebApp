import type { Booking } from '@/types'

// ─── Status metadata ─────────────────────────────────────────────────────────

export type BookingStatus = Booking['status']

export const STATUS_LABELS: Record<string, string> = {
  pending:    'Pending',
  confirmed:  'Confirmed',
  inprogress: 'In progress',
  completed:  'Completed',
  cancelled:  'Cancelled',
  declined:   'Declined',
}

/** bg/text pairs for status pills. */
export const STATUS_PILL: Record<string, string> = {
  pending:    'bg-amber-50 text-amber-800 ring-amber-200',
  confirmed:  'bg-blue-50 text-blue-800 ring-blue-200',
  inprogress: 'bg-purple-50 text-purple-800 ring-purple-200',
  completed:  'bg-green-50 text-green-800 ring-green-200',
  cancelled:  'bg-red-50 text-red-600 ring-red-200',
  declined:   'bg-red-50 text-red-700 ring-red-200',
}

/** Solid dot colors (calendar, compact rows). */
export const STATUS_DOT: Record<string, string> = {
  pending:    'bg-amber-400',
  confirmed:  'bg-blue-500',
  inprogress: 'bg-purple-500',
  completed:  'bg-green-500',
  cancelled:  'bg-red-300',
  declined:   'bg-red-400',
}

// Only bookings in a terminal state can be bulk-cleared — pending/confirmed
// appointments are still live. The API enforces the same rule.
export const CLEARABLE_STATUSES = new Set<string>(['completed', 'cancelled', 'declined'])

// Statuses /api/admin/notify has an email template for.
export const NOTIFY_STATUSES = new Set<string>(['confirmed', 'declined', 'cancelled'])

// ─── Timezone helpers (everything bucketed/displayed in Calgary local time) ──

export const CALGARY_TZ = 'America/Edmonton'

const dayKeyFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: CALGARY_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** YYYY-MM-DD for the given ISO timestamp, as a Calgary calendar day. */
export function calgaryDateKey(iso: string): string {
  return dayKeyFmt.format(new Date(iso))
}

/** e.g. "2:30 PM" in Calgary local time. */
export function calgaryTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    timeZone: CALGARY_TZ,
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** YYYY-MM-DD from calendar parts (0-indexed month). */
export function dateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Today's date as calendar parts (0-indexed month) in Calgary local time. */
export function calgaryNowParts(): { key: string; y: number; m: number; d: number } {
  const key = dayKeyFmt.format(new Date())
  const [y, m, d] = key.split('-').map(Number)
  return { key, y, m: m - 1, d }
}

/** Shift a YYYY-MM-DD key by n days. */
export function addDaysKey(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

/** "Today", "Tomorrow", or e.g. "Thu, Nov 26" for a YYYY-MM-DD key. */
export function dayHeading(key: string, todayKey: string): string {
  if (key === todayKey) return 'Today'
  if (key === addDaysKey(todayKey, 1)) return 'Tomorrow'
  if (key === addDaysKey(todayKey, -1)) return 'Yesterday'
  const [y, m, d] = key.split('-').map(Number)
  const thisYear = Number(todayKey.slice(0, 4))
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(y !== thisYear ? { year: 'numeric' } : {}),
  })
}

/** e.g. "Nov 26, 2026, 10:00 a.m." in Calgary time. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    timeZone: CALGARY_TZ,
  })
}

/** e.g. "Thursday, November 26, 2026" in Calgary time — used in emails. */
export function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: CALGARY_TZ,
  })
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

/** Group bookings (already sorted) into [dayKey, bookings[]] pairs in order. */
export function groupByDay(bookings: Booking[]): [string, Booking[]][] {
  const groups: [string, Booking[]][] = []
  for (const b of bookings) {
    const key = calgaryDateKey(b.date_time)
    const last = groups[groups.length - 1]
    if (last && last[0] === key) last[1].push(b)
    else groups.push([key, [b]])
  }
  return groups
}

export function byDateAsc(a: Booking, b: Booking): number {
  return a.date_time.localeCompare(b.date_time)
}
