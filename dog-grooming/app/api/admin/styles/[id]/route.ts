import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/utils/supabase/admin";


export async function DELETE( req: NextRequest, context: { params: Promise<{ id: string }> }) 
{
  const { id } = await context.params

  if (isNaN(Number(id))) {
    return NextResponse.json(
      { error: "Invalid id" },
      { status: 400 }
    )
  }

  const supabase = createAdminClient();
  const { error } = await supabase
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