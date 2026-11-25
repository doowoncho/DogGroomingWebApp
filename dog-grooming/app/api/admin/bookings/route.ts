import { requireAdmin } from "@/lib/requireAdmin";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { ALL_SLOTS, SLOT_HOLDING_STATUSES, fitsAt, occupiedSlotIndices, timeLabelFromDateTime } from "@/lib/slots";

/**
 * Quick-add: the groomer records a booking she arranged outside the site
 * (usually KakaoTalk). Only service, time and dog name are required; it's saved
 * as confirmed and holds the slot like any other booking.
 */
export async function POST(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid or empty request body' }, { status: 400 })
  }

  for (const field of ['service_id', 'date_time', 'dog_name']) {
    if (!body[field] || (typeof body[field] === 'string' && !body[field].trim())) {
      return NextResponse.json({ error: `${field} is required` }, { status: 400 })
    }
  }

  const dateTime = String(body.date_time)
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateTime)) {
    return NextResponse.json({ error: 'date_time must look like 2026-11-26T10:00:00' }, { status: 400 })
  }
  const startIndex = ALL_SLOTS.indexOf(timeLabelFromDateTime(dateTime))
  if (startIndex === -1) {
    return NextResponse.json({ error: 'Invalid time slot' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: service } = await supabase
    .from('services')
    .select('slots')
    .eq('id', body.service_id)
    .maybeSingle()
  if (!service) {
    return NextResponse.json({ error: 'Unknown service' }, { status: 400 })
  }

  const date = dateTime.split('T')[0]
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
    return NextResponse.json({ error: 'That time is already booked' }, { status: 409 })
  }

  const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

  const { data, error } = await supabase
    .from('bookings')
    .insert([{
      service_id: body.service_id,
      date_time:  dateTime,
      dog_name:   text(body.dog_name),
      breed:      text(body.breed) || null,
      // phone and email are NOT NULL in the table; Kakao customers often have neither.
      phone:      text(body.phone),
      email:      text(body.email),
      kakaoid:    text(body.kakaoid) || null,
      notes:      text(body.notes) || null,
      status:     body.status === 'pending' ? 'pending' : 'confirmed',
    }])
    .select()
    .single()

  if (error) {
    if ((error as { code?: string }).code === '23P01') {
      return NextResponse.json({ error: 'That time is already booked' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ booking: data }, { status: 201 })
}

export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("bookings")
    .select("*")

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ bookings: data });
}

export async function PATCH(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

   const supabase = createAdminClient();
  try {
    let body: any
    try {
      body = await req.json()
      console.log(body)
    } catch {
      return NextResponse.json({ error: 'Invalid or empty request body' }, { status: 400 })
    }

    const { id, status } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, booking: data })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Bookings can only ever be bulk-deleted while in a terminal state. This is
// enforced here (not just in the admin UI) so a stray request can't remove a
// live pending/confirmed appointment.
const CLEARABLE_STATUSES = ['completed', 'cancelled', 'declined']

export async function DELETE(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  const supabase = createAdminClient();
  try {
    const { searchParams } = new URL(req.url)
    const singleId = searchParams.get('id')

    let ids: string[] = []
    if (singleId) {
      ids = [singleId]
    } else {
      let body: any = null
      try {
        body = await req.json()
      } catch {
        // no JSON body — fine, ids stays empty and we 400 below
      }
      if (body?.ids && Array.isArray(body.ids)) {
        ids = body.ids.filter((id: unknown) => typeof id === 'string')
      }
    }

    if (ids.length === 0) {
      return NextResponse.json({ error: 'id or ids is required' }, { status: 400 })
    }

    const { data: deleted, error } = await supabase
      .from('bookings')
      .delete()
      .in('id', ids)
      .in('status', CLEARABLE_STATUSES)
      .select('id')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const deletedIds = (deleted ?? []).map(d => d.id)
    // Anything requested but not actually deleted was either not found, or
    // wasn't in a clearable status — either way, worth reporting back.
    const skippedIds = ids.filter(id => !deletedIds.includes(id))

    return NextResponse.json({ success: true, deletedIds, skippedIds })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}