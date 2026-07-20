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

// "2026-07-19T09:00:00" -> "9:00 AM"
function timeLabelFromDateTime(dateTime: string) {
  const time = dateTime.split('T')[1] ?? dateTime
  const [hhStr, mmStr] = time.split(':')
  const hours = Number(hhStr)
  const minutes = Number(mmStr)
  const period = hours >= 12 ? 'PM' : 'AM'
  let hours12 = hours % 12
  if (hours12 === 0) hours12 = 12
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`
}

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
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('bookings')
    .select('date_time, services(slots)')
    .gte('date_time', `${date}T00:00:00`)
    .lt('date_time', `${date}T23:59:59`)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Build set of all minutes that are occupied by existing bookings
  const occupiedIndices = new Set<number>()

  //checking every booking and marking slots as occupied
  for (const booking of data ?? []) {
    const timeLabel = timeLabelFromDateTime(booking.date_time)
    const startIndex = ALL_SLOTS.indexOf(timeLabel)
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