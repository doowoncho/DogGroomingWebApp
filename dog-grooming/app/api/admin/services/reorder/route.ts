import { createAdminClient } from "@/utils/supabase/admin";

export async function PATCH(req: Request) {

const supabase = createAdminClient();
  const { order }: { order: { id: number; order: number }[] } = await req.json()

  const updates = order.map(({ id, order }) =>
    supabase.from('services').update({ order }).eq('id', id)
  )

  const results = await Promise.all(updates)
  const failed = results.find(r => r.error)

  if (failed) {
    return Response.json({ error: failed.error?.message }, { status: 500 })
  }

  return Response.json({ success: true })
}