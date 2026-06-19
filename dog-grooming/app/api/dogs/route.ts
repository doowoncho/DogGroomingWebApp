import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { browseLimiter, dogLimiter } from "@/lib/rate-limit";

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
    .from("dogs")
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ dogs: data });
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "anon";
  const { success } = await dogLimiter.limit(ip);
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

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { name, breed } = body;

  const { data, error } = await supabase
    .from("dogs")
    .insert({
      user_id: user.id,
      name,
      breed,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ dog: data });
}

export async function PATCH(req: Request) {

 const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  
  const body = await req.json();
  const { id, name, breed } = body;

  const { data, error } = await supabase
    .from("dogs")
    .update({
      name,
      breed,
    })
    .eq("id", id)
    .eq("user_id", user.id) // 🔒 important security guard
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ dog: data });
}

export async function DELETE(req: Request) {

 const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await req.json();

  const { error } = await supabase
    .from("dogs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}