// app/api/availability/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { browseLimiter } from "@/lib/rate-limit";

const ALL_SLOTS = [
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
  '5:00 PM',
]

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

  const todayString = new Date().toISOString().split('T')[0]
  const isSameDay = date === todayString

  if (isSameDay) {
  return NextResponse.json({
    slots: ALL_SLOTS.map((time) => ({
      time,
      available: false,
    })),
  })
  }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('bookings')
    .select('time, services(slots)')
    .eq('date', date)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Build set of all minutes that are occupied by existing bookings
  const occupiedIndices = new Set<number>()

  //checking every booking and marking slots as occupied
  for (const booking of data ?? []) {
    const startIndex = ALL_SLOTS.indexOf(booking.time)
    if (startIndex === -1) continue
    const slots = (booking.services as any)?.slots ?? 1

    for (let i = 0; i < slots; i++) {
      occupiedIndices.add(startIndex + i)
    }
  }

  // A slot is available only if ALL slots the incoming service needs are free
  const slots = ALL_SLOTS.map((time, index) => {
    let available = true

    for (let i = 0; i < incomingSlots; i++) {
      if (occupiedIndices.has(index + i)) {
        available = false
        break
      }
    }

    return { time, available }
  })

  return NextResponse.json({ slots })
}