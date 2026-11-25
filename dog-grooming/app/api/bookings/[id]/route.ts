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

  const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

  // Customers can only change a request the groomer hasn't acted on yet.
  // Once it's confirmed (or declined/cancelled), changes go through her directly.
  const { data: booking, error } = await supabase
    .from('bookings')
    .update({
      dog_name: text(dogName),
      phone:    text(phone),
      kakaoid:  text(kakaoid) || null,
      notes:    text(notes) || null,
      breed:    text(breed) || null,
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select('*, services!service_id(name_eng)')
    .single()

  if (error || !booking) {
    return NextResponse.json(
      { error: 'This request can no longer be edited. Please message us on KakaoTalk.' },
      { status: 409 },
    )
  }

  // A mail failure must not turn a saved edit into an error for the customer.
  try {
    await notifyAdmin({
      isEdit: true,
      service: booking.services?.name_eng,
      phone: booking.phone,
      kakaoid: booking.kakaoid,
      dog_name: booking.dog_name,
      date_time: booking.date_time,
      breed: booking.breed
    })
  } catch (err) {
    console.error('Admin edit notification failed:', err)
  }
  return NextResponse.json({ booking })
}