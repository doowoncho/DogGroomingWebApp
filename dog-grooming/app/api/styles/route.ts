// app/api/styles/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import type { GroomingStyle } from '@/types'

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('styles')
    .select('*')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ styles: data as GroomingStyle[] })
}