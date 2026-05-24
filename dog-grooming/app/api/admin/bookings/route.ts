import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  // 🔒 Create ADMIN client (server-only)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚠️ NEVER expose this to browser
  );

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("*")

  console.log("Admin bookings:", data);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ bookings: data });
}