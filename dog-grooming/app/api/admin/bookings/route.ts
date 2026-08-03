import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET() {
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