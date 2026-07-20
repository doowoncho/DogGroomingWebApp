import { NextResponse } from 'next/server'
import { notifyAdmin } from '@/lib/notifyAdmin'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    if (!body.dog_name || !body.date_time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await notifyAdmin(body)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Admin email error:', err)
    return NextResponse.json({ error: 'Failed to send admin notification' }, { status: 500 })
  }
}