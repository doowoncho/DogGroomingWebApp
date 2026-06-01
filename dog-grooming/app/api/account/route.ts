import { createClient } from '@/utils/supabase/server'

export async function POST(req: Request) {
  const body = await req.json()
  const { email, password, phone, dogName, breed, bookingId,  } = body

 try {
  const supabase = await createClient()
  const { data: userData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      phone
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

  // 3. dog
  const { error: dogError } = await supabase.from('dogs').insert({
    user_id: user.id,
    name: dogName,
    breed,
  })

  if (dogError) {
    await supabase.auth.admin.deleteUser(user.id)
    return Response.json({ error: dogError.message }, { status: 400 })
  }

  return Response.json({ success: true })
} catch (err: any) {
  return Response.json({ error: err.message }, { status: 500 })
}
}