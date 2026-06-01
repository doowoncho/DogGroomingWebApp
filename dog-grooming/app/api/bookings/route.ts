import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from "next/headers";

export async function POST(req: Request) {
  let body: any

  try {
    body = await req.json()
  } catch (err) {
    return NextResponse.json({ error: 'Invalid or empty request body' }, { status: 400 })
  }

  // Basic validation
  const required = ['service_id', 'date', 'time', 'dog_name', 'email', 'phone']
  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json({ error: `${field} is required` }, { status: 400 })
    }
  }

  // Check slot is still available (race condition protection)
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('bookings')
    .select('time, services(slots)')
    .eq('date', body.date)

  const bookedTimes = new Set<string>()

  const ALL_SLOTS = [
    '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
  ]

    for (const booking of existing ?? []) {
      const startIndex = ALL_SLOTS.indexOf(booking.time)
      const service = (booking.services?.[0] ?? null) as { slots: number } | null
      for (let i = 0; i < (service?.slots ?? 1); i++) {
        const slot = ALL_SLOTS[startIndex + i]
        if (slot) bookedTimes.add(slot)
      }
    }

  if (bookedTimes.has(body.time)) {
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
      date:          body.date,
      time:          body.time,
      style_id:      body.style_id ?? null,
      dog_name:      body.dog_name,
      breed:         body.breed ?? null,
      email:         body.email,
      phone:         body.phone,
      notes:         body.notes || null,
      user_id: user?.id ?? null,  // ✅ server-controlled
      status:        'pending', // default status
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