// app/api/services/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import type { Service } from '@/types'
import { browseLimiter } from '@/lib/rate-limit';

export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "anon";
  const { success } = await browseLimiter.limit(ip);
  if (!success) {
    return new Response("Too many requests", { status: 429 });
  }
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('services')
    .select('*')


  console.error('Error fetching services:', error) // Log the error for debugging
    

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ services: data as Service[] })
}