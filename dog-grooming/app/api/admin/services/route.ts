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

export async function POST(req: Request) {
  try {
    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid or empty request body' }, { status: 400 })
    }

    const { name_eng, name_kor, desc_eng, desc_kor, duration, icon, needs_style, sm_price, md_price, lg_price } = body

    if (!name_eng || typeof name_eng !== 'string' || !name_eng.trim()) {
      return NextResponse.json({ error: 'name_eng is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // figure out the next sort_order so new services land at the end of the list
    const { data: maxOrderRow, error: maxOrderError } = await supabase
      .from('services')
      .select('order')
      .order('order', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (maxOrderError) {
      return NextResponse.json({ error: maxOrderError.message }, { status: 500 })
    }

    const nextSortOrder = (maxOrderRow?.order ?? -1) + 1

    const insert = {
      name_eng: name_eng.trim(),
      name_kor: name_kor ?? '',
      desc_eng: desc_eng ?? '',
      desc_kor: desc_kor ?? '',
      sm_price: sm_price ?? 0,
      md_price: md_price ?? 0,
      lg_price: lg_price ?? 0,
      duration: 180,
      icon: icon ?? '',
      needs_style: needs_style ?? false,
      slots: durationToSlots(duration ?? 180),
      order: nextSortOrder,
    }

    const { data, error } = await supabase
      .from('services')
      .insert(insert)
      .select()
      .single()

    console.log('Insert result:', { data, error })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, service: data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('services')
      .delete()
      .select()
      .eq('id', id)
      .maybeSingle()

    console.log('Delete result:', { data, error })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, service: data })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}