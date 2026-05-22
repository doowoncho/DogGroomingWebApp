// app/api/styles/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { GroomingStyle } from '@/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET() {
  const { data, error } = await supabase
    .from('styles')
    .select('*')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ styles: data as GroomingStyle[] })
}