import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
)

export async function POST(req: Request) {
  const body = await req.json()
  const { email, password, phone, dogName, breed, bookingId,  } = body

 try {
  const { data: userData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

  if (authError || !userData?.user) {
    return Response.json({ error: authError?.message }, { status: 400 })
  }

  const user = userData.user
  
  if (bookingId) {
    await supabase
      .from('bookings')
      .update({ user_id: user.id })
      .eq('id', bookingId)
  }

  // 2. profile
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      user_id: user.id,
      phone,
    })

  if (profileError) {
    await supabase.auth.admin.deleteUser(user.id)
    return Response.json({ error: profileError.message }, { status: 400 })
  }

  // 3. dog
  const { error: dogError } = await supabase.from('dogs').insert({
    user_id: user.id,
    name: dogName,
    breed,
  })

  if (dogError) {
    await supabase.from('profiles').delete().eq('user_id', user.id)
    await supabase.auth.admin.deleteUser(user.id)
    return Response.json({ error: dogError.message }, { status: 400 })
  }

  return Response.json({ success: true })
} catch (err: any) {
  return Response.json({ error: err.message }, { status: 500 })
}
}