import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

function durationToSlots(duration: number) {
  // Assuming 1 slot = 30 minutes
  return Math.ceil(duration / 60);
}

export async function PATCH(req: Request) {
  try {

    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid or empty request body' }, { status: 400 })
    }

    const { id, slots, ...fields } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const update = Object.fromEntries(Object.entries(fields))

    update.slots = durationToSlots(fields.duration)

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('services')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    console.log('Update result:', { data, error })

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Service not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, service: data })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}