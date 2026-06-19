import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { browseLimiter } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "anon";
  const { success } = await browseLimiter.limit(ip);
  if (!success) {
    return new Response("Too many requests", { status: 429 });
  }
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .single()

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
  
  return NextResponse.json(data);
}