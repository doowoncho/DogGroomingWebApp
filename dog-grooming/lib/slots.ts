// Shared slot logic for availability checks (GET /api/availability) and the
// server-side conflict check when a booking is created (POST /api/bookings).

export const ALL_SLOTS = [
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
  '5:00 PM',
]

// Only these statuses hold a time slot. Cancelled/declined/completed bookings
// must not block new customers from booking that time.
export const SLOT_HOLDING_STATUSES = ['pending', 'confirmed']

// "2026-07-19T09:00:00" -> "9:00 AM"
export function timeLabelFromDateTime(dateTime: string) {
  const time = dateTime.split('T')[1] ?? dateTime
  const [hhStr, mmStr] = time.split(':')
  const hours = Number(hhStr)
  const minutes = Number(mmStr)
  const period = hours >= 12 ? 'PM' : 'AM'
  let hours12 = hours % 12
  if (hours12 === 0) hours12 = 12
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`
}

type BookingWithSlots = {
  date_time: string
  // Supabase returns a many-to-one join as an object, but be tolerant of an array.
  services: { slots: number | null } | { slots: number | null }[] | null
}

function slotsOf(booking: BookingWithSlots): number {
  const svc = Array.isArray(booking.services) ? booking.services[0] : booking.services
  return svc?.slots ?? 1
}

/** Indices into ALL_SLOTS that are taken by the given bookings. */
export function occupiedSlotIndices(bookings: BookingWithSlots[]): Set<number> {
  const occupied = new Set<number>()
  for (const booking of bookings) {
    const start = ALL_SLOTS.indexOf(timeLabelFromDateTime(booking.date_time))
    if (start === -1) continue
    for (let i = 0; i < slotsOf(booking); i++) occupied.add(start + i)
  }
  return occupied
}

/** True if a service needing `slotsNeeded` slots can start at `startIndex`. */
export function fitsAt(occupied: Set<number>, startIndex: number, slotsNeeded: number): boolean {
  if (startIndex < 0) return false
  for (let i = 0; i < slotsNeeded; i++) {
    if (occupied.has(startIndex + i)) return false
  }
  return true
}
