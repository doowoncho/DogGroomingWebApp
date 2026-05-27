import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const getSupabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

export async function DELETE( req: NextRequest, context: { params: Promise<{ id: string }> }) 
{
  const { id } = await context.params

  if (isNaN(Number(id))) {
    return NextResponse.json(
      { error: "Invalid id" },
      { status: 400 }
    )
  }

  const { error } = await getSupabase()
    .from("styles")
    .delete()
    .eq("id", id)

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}