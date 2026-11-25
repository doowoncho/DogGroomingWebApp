import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { cookies } from "next/headers";
import { bookingLimiter } from "@/lib/rate-limit";
import { ALL_SLOTS, SLOT_HOLDING_STATUSES, fitsAt, occupiedSlotIndices, timeLabelFromDateTime } from '@/lib/slots'
import { notifyAdmin } from '@/lib/notifyAdmin'

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

  const date = String(body.date_time).split('T')[0]
  const startIndex = ALL_SLOTS.indexOf(timeLabelFromDateTime(String(body.date_time)))
  if (startIndex === -1) {
    return NextResponse.json({ error: 'Invalid time slot' }, { status: 400 })
  }

  // Bookings aren't readable or writable by the public directly; this route is
  // the only way in, so it uses the server-only key after validating the request.
  const supabase = createAdminClient()

  // How many slots the requested service takes
  const { data: service } = await supabase
    .from('services')
    .select('slots, name_eng')
    .eq('id', body.service_id)
    .maybeSingle()

  if (!service) {
    return NextResponse.json({ error: 'Unknown service' }, { status: 400 })
  }

  // Check slot is still available (race condition protection). Only active
  // bookings hold a slot; cancelled/declined ones don't.
  const { data: existing, error: existingError } = await supabase
    .from('bookings')
    .select('date_time, services(slots)')
    .gte('date_time', `${date}T00:00:00`)
    .lt('date_time', `${date}T23:59:59`)
    .in('status', SLOT_HOLDING_STATUSES)

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 })
  }

  if (!fitsAt(occupiedSlotIndices(existing ?? []), startIndex, service.slots ?? 1)) {
    return NextResponse.json(
      { error: 'This time slot is no longer available' },
      { status: 409 },
    )
  }

  // Who is booking (if signed in) comes from the session cookie, never the body
  const { data: { user } } = await (await createClient()).auth.getUser()
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
  // 23P01 = bookings_no_overlap exclusion constraint: someone booked this time
  // between our availability check and the insert.
  if ((error as { code?: string }).code === '23P01') {
    return NextResponse.json({ error: 'This time slot is no longer available' }, { status: 409 })
  }
  return NextResponse.json({ error: error.message }, { status: 500 })
}

// Email the groomer about the new request. A mail failure must not fail the booking.
try {
  await notifyAdmin({
    service: service.name_eng,
    phone: data.phone,
    kakaoid: data.kakaoid,
    dog_name: data.dog_name,
    date_time: data.date_time,
    notes: data.notes,
    breed: data.breed ?? undefined,
  })
} catch (err) {
  console.error('Admin notification failed:', err)
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