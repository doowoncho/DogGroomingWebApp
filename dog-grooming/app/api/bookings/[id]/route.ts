import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin' 

import { notifyAdmin } from '@/lib/notifyAdmin'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid or empty request body' }, { status: 400 })
  }

  const { dogName, phone, kakaoid, notes, breed} = body

  if (!dogName || !phone) {
    return NextResponse.json({ error: 'Dog name and phone are required' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  const { data: booking, error } = await supabase
    .from('bookings')
    .update({
      dog_name: dogName,
      phone,
      kakaoid: kakaoid ?? null,
      notes: notes || null,
      breed: breed
    })
    .eq('id', id)
    .select('*, services!service_id(name_eng)')
    .single()

    console.log(booking)

  if (error || !booking) {
    return NextResponse.json(
      { error: 'This request can no longer be edited' },
      { status: 409 },
    )
  }
await notifyAdmin({
  isEdit: true,
  service: booking.services?.name_eng,
  phone: booking.phone,
  kakaoid: booking.kakaoid,
  dog_name: booking.dog_name,
  date_time: booking.date_time,
  breed: booking.breed
})
  return NextResponse.json({ booking })
}