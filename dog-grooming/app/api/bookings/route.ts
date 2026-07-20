import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from "next/headers";
import { bookingLimiter } from "@/lib/rate-limit";

const ALL_SLOTS = [
  '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
]

// "2026-07-19T09:00:00" -> { date: "2026-07-19", timeLabel: "9:00 AM" }
function splitDateTime(dateTime: string) {
  const [date, time] = dateTime.split('T')
  const [hhStr, mmStr] = time.split(':')
  const hours = Number(hhStr)
  const minutes = Number(mmStr)
  const period = hours >= 12 ? 'PM' : 'AM'
  let hours12 = hours % 12
  if (hours12 === 0) hours12 = 12
  const timeLabel = `${hours12}:${String(minutes).padStart(2, '0')} ${period}`
  return { date, timeLabel }
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "anon";
  const { success } = await bookingLimiter.limit(ip);

  if (!success) {
    return new Response("Too many booking attempts. Please wait a moment and try again.", {
      status: 429,
    });
  }
  
  let body: any

  try {
    body = await req.json()
  } catch (err) {
    return NextResponse.json({ error: 'Invalid or empty request body' }, { status: 400 })
  }

  // Basic validation
  const required = ['service_id', 'date_time', 'dog_name', 'phone']
  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json({ error: `${field} is required` }, { status: 400 })
    }
  }

  const { date, timeLabel } = splitDateTime(body.date_time)

  // Check slot is still available (race condition protection)
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('bookings')
    .select('date_time, services(slots)')
    .gte('date_time', `${date}T00:00:00`)
    .lt('date_time', `${date}T23:59:59`)

  const bookedTimes = new Set<string>()

  for (const booking of existing ?? []) {
    const { timeLabel: bookedLabel } = splitDateTime(booking.date_time)
    const startIndex = ALL_SLOTS.indexOf(bookedLabel)
    const service = (booking.services?.[0] ?? null) as { slots: number } | null
    for (let i = 0; i < (service?.slots ?? 1); i++) {
      const slot = ALL_SLOTS[startIndex + i]
      if (slot) bookedTimes.add(slot)
    }
  }

  if (bookedTimes.has(timeLabel)) {
    return NextResponse.json(
      { error: 'This time slot is no longer available' },
      { status: 409 },
    )
  }


  const { data: { user } } = await supabase.auth.getUser()
  // Insert booking
  const { data, error } = await supabase
    .from('bookings')
    .insert([{
      service_id:    body.service_id,
      date_time:     body.date_time,
      style_id:      body.style_id ?? null,
      dog_name:      body.dog_name,
      breed:         body.breed ?? null,
      email:         body.email ?? null,
      phone:         body.phone,
      notes:         body.notes || null,
      user_id: user?.id ?? null,  // ✅ server-controlled
      status:        'pending', // default status
      kakaoid:        body.kakaoid
    }])
    .select()
    .single()

if (error) {
  return NextResponse.json({ error: error.message }, { status: 500 })
}

return NextResponse.json({
  success: true,
  booking: data,
})
}

export async function GET() {
  const cookieStore = await cookies();
  const supabase = await createClient() 

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("user_id", user.id) 

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ bookings: data });
}