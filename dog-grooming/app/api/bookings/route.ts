import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Booking } from '@/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
)

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
  const { data: existing } = await supabase
    .from('bookings')
    .select('time, duration_slots')
    .eq('date', body.date)

  const bookedTimes = new Set<string>()
  const ALL_SLOTS = [
    '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
  ]

  for (const booking of existing ?? []) {
    const startIndex = ALL_SLOTS.indexOf(booking.time)
    for (let i = 0; i < (booking.duration_slots ?? 1); i++) {
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
    }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return Response.json({
  success: true,
  booking: data, // MUST include id
})
}

export async function GET(request: Request) {

  let query = supabase.from('bookings').select('*')

  const { data, error } = await query.order('date', { ascending: true })

  if (error) {
    console.error('Supabase error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log('Bookings retrieved:', data?.length || 0, 'records')
  return NextResponse.json({ bookings: data ?? [] })
}