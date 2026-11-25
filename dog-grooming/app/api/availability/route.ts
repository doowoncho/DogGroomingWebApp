// app/api/availability/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { browseLimiter } from "@/lib/rate-limit";
import { ALL_SLOTS, SLOT_HOLDING_STATUSES, fitsAt, occupiedSlotIndices } from '@/lib/slots'

export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "anon";
  const { success } = await browseLimiter.limit(ip);
  if (!success) {
    return new Response("Too many requests", { status: 429 });
  }
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const serviceSlotsParam = searchParams.get('slots')
  const incomingSlots = serviceSlotsParam ? parseInt(serviceSlotsParam) : 1

  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 })

  const todayString = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Edmonton',
  })
  const isSameDay = date === todayString

  if (isSameDay) {
    console.log("availability for today, marking past slots as unavailable")
  return NextResponse.json({
    slots: ALL_SLOTS.map((time) => ({
      time,
      available: false,
    })),
  })
  }
  // Server-only key: the public has no direct read access to bookings (they hold
  // customer contact details). Only the time and service length are selected.
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('bookings')
    .select('date_time, services(slots)')
    .gte('date_time', `${date}T00:00:00`)
    .lt('date_time', `${date}T23:59:59`)
    .in('status', SLOT_HOLDING_STATUSES)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const occupied = occupiedSlotIndices(data ?? [])

  // A slot is available only if ALL slots the incoming service needs are free
  const slots = ALL_SLOTS.map((time, index) => ({
    time,
    available: fitsAt(occupied, index, incomingSlots),
  }))

  return NextResponse.json({ slots })
}