import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const getSupabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

export async function POST(req: Request) {
  try {
    const formData = await req.formData()

    const bookingId = formData.get('bookingId') as string
    const files = formData.getAll('files') as File[]

    if (!bookingId || !files.length) {
      return NextResponse.json(
        { error: 'Missing data' },
        { status: 400 }
      )
    }

    const uploads = await Promise.all(
      files.map(async (file) => {
        const path = `bookings/${bookingId}/${crypto.randomUUID()}-${file.name}`

         const supabase = getSupabase()
        const { error } = await supabase.storage
          .from('MungMungPhotos')
          .upload(path, file, {
            contentType: file.type,
            upsert: false,
          })

        if (error) throw error

        const { data } = supabase.storage
          .from('MungMungPhotos')
          .getPublicUrl(path)

        return {
          booking_id: bookingId,
          url: data.publicUrl,
          path,
        }
      })
    )

    // insert all into DB
    const supabase = getSupabase()
    const { error: dbError } = await supabase
      .from('photos')
      .insert(uploads)

    if (dbError) throw dbError

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Upload failed' },
      { status: 500 }
    )
  }
}

// ─── GET: fetch photos by bookingId ─────────────────────────────
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const bookingId = searchParams.get('bookingId')

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Missing bookingId' },
        { status: 400 }
      )
    }
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('photos')
      .select('id, booking_id, url, path, created_at')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ photos: data })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Failed to fetch photos' },
      { status: 500 }
    )
  }
}