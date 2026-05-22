// app/api/services/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Service } from '@/types'

const getSupabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

export async function GET() {
  const { data, error } = await getSupabase()
    .from('services')
    .select('*')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ services: data as Service[] })
}