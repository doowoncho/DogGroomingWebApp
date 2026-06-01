import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const logger = {
  info:  (msg: string, meta?: object) => console.log(JSON.stringify({ level: "info",  msg, ...meta, ts: new Date().toISOString() })),
  warn:  (msg: string, meta?: object) => console.warn(JSON.stringify({ level: "warn",  msg, ...meta, ts: new Date().toISOString() })),
  error: (msg: string, meta?: object) => console.error(JSON.stringify({ level: "error", msg, ...meta, ts: new Date().toISOString() })),
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const bookingId = formData.get("bookingId") as string
    const files = formData.getAll("files") as File[]

    if (!bookingId || !files.length) {
      logger.warn("Upload rejected: missing fields", { bookingId, fileCount: files.length })
      return NextResponse.json({ error: "Missing data" }, { status: 400 })
    }

    logger.info("Upload started", { bookingId, fileCount: files.length })

    const supabase = await createClient()  // create once, not per-file

    const uploads = await Promise.all(
      files.map(async (file) => {
        const path = `bookings/${bookingId}/${crypto.randomUUID()}-${file.name}`

        const { error } = await supabase.storage
          .from("MungMungPhotos")
          .upload(path, file, { contentType: file.type, upsert: false })

        if (error) {
          logger.error("Storage upload failed", { bookingId, path, error: error.message })
          throw error
        }

        logger.info("File uploaded", { bookingId, path })
        return { booking_id: bookingId, path }
      })
    )

    const { error: dbError } = await supabase.from("photos").insert(uploads)

    if (dbError) {
      logger.error("DB insert failed", {
        bookingId,
        fileCount: uploads.length,
        paths: uploads.map((u) => u.path),
        error: dbError.message,
        code: dbError.code,
      })
      throw dbError
    }

    logger.info("Upload complete", { bookingId, fileCount: uploads.length })
    return NextResponse.json({ success: true })

  } catch (err: any) {
    logger.error("Unhandled upload error", { error: err.message, stack: err.stack })
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}

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

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('booking_id', bookingId)

    if (error) throw error

    const photosWithSignedUrls = await Promise.all(
      data.map(async (photo) => {
        const { data: signedData, error: signedError } =
          await supabase.storage
            .from('MungMungPhotos')
            .createSignedUrl(photo.path, 60 * 60)

        if (signedError) {
          console.error(signedError)

          return {
            ...photo,
            signedUrl: null,
          }
        }

        return {
          ...photo,
          signedUrl: signedData.signedUrl,
        }
      })
    )

    return NextResponse.json({
      photos: photosWithSignedUrls,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Failed to fetch photos' },
      { status: 500 }
    )
  }
}