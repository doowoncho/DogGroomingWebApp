import { createAdminClient } from '@/utils/supabase/admin'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password, phone, dogName, breed, bookingId, fullname } = body

    const supabase = createAdminClient() // also: no need to await, it's not async
    const { data: userData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        phone,
      })

    if (authError || !userData?.user) {
      return Response.json({ error: authError?.message ?? 'Failed to create user' }, { status: 400 })
    }

    const user = userData.user

    const { error: profileError } = await supabase.from('profiles').insert({
      user_id: user.id,
      full_name: fullname,
    })

    if (profileError) {
      await supabase.auth.admin.deleteUser(user.id)
      return Response.json({ error: profileError.message }, { status: 400 })
    }

    if (bookingId) {
      await supabase.from('bookings').update({ user_id: user.id }).eq('id', bookingId)
    }

    if(dogName){
        const { error: dogError } = await supabase.from('dogs').insert({
        user_id: user.id,
        name: dogName,
        breed,
      })

      if (dogError) {
        await supabase.auth.admin.deleteUser(user.id)
        return Response.json({ error: dogError.message }, { status: 400 })
      }
    }



    return Response.json({ success: true })
  } catch (err: any) {
    console.error('Signup error:', err) // worth keeping even after the fix — silent failures are hard to debug
    return Response.json({ error: err.message ?? 'Something went wrong' }, { status: 500 })
  }
}