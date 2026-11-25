import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * Guards /api/admin/* route handlers. The middleware only protects the /admin
 * pages, and these routes use the service-role client (which bypasses RLS),
 * so every handler must call this first.
 *
 * Returns a 401/403 response to send back, or null when the caller is an admin.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return null
}
