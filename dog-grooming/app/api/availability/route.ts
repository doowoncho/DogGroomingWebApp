// app/api/availability/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const getSupabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  )

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
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')


    if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 })

    const supabase = getSupabase()
    const { data, error } = await supabase
    .from('bookings')
    .select('time, services(slots)')
    .eq('date', date)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const blockedSlots = new Set<string>()

    for (const booking of data ?? []) {
    const startIndex = ALL_SLOTS.indexOf(booking.time)
    if (startIndex === -1) continue

    const slots = (booking.services as any)?.slots ?? 1

    for (let i = 0; i < slots; i++) {
        const slot = ALL_SLOTS[startIndex + i]
        if (slot) blockedSlots.add(slot)
    }
    }

    const slots = ALL_SLOTS.map((time) => ({
    time,
    available: !blockedSlots.has(time),
    }))

  return NextResponse.json({ slots })
}