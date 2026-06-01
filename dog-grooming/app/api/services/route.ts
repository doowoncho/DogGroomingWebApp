// app/api/services/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import type { Service } from '@/types'

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('services')
    .select('*')


  console.error('Error fetching services:', error) // Log the error for debugging
    

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ services: data as Service[] })
}