import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from "next/headers";
import { createServerClient } from '@supabase/ssr';

const getSupabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
  const supabase = getSupabase()
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
      user_id:       body.user_id || null
    }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return Response.json({
  success: true,
  booking: data, // MUST include id
})
}

export async function GET() {
  const cookieStore = await cookies(); // ✅ FIX IS HERE

 const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  }
);

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

    console.log("Bookings data:", data); // Debug log

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ bookings: data });
}