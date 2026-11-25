import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAdmin'
import { createAdminClient } from '@/utils/supabase/admin'
import { ALL_SLOTS, SLOT_HOLDING_STATUSES, fitsAt, occupiedSlotIndices } from '@/lib/slots'

/**
 * Free slots for the admin quick-add and share-link pickers. Same rules as the
 * public /api/availability, except the groomer may book today.
 */
export async function GET(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const slotsNeeded = Math.max(1, parseInt(searchParams.get('slots') ?? '1') || 1)

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date required (YYYY-MM-DD)' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('bookings')
    .select('date_time, services(slots)')
    .gte('date_time', `${date}T00:00:00`)
    .lt('date_time', `${date}T23:59:59`)
    .in('status', SLOT_HOLDING_STATUSES)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const occupied = occupiedSlotIndices(data ?? [])
  return NextResponse.json({
    slots: ALL_SLOTS.map((time, index) => ({
      time,
      available: fitsAt(occupied, index, slotsNeeded),
    })),
  })
}
