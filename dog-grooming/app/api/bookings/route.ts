import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
)

export async function POST(req: Request) {
  const body = await req.json()

  const { data, error } = await supabase
    .from('bookings')
    .insert([body])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
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