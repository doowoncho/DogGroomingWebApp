import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
})

const ADMIN_EMAIL = process.env.ADMIN_EMAIL

// "2026-07-19T09:00:00" -> "Jul 19, 2026 · 9:00 AM"
function formatDateTime(dateTime: string) {
  const d = new Date(dateTime)
  if (isNaN(d.getTime())) return dateTime

  const dateLabel = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const timeLabel = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${dateLabel} · ${timeLabel}`
}

export async function POST(req: Request) {
  try {
    const {
      service,
      // email,
      phone,
      dog_name,
      date_time,
      notes,
      kakaoid
    } = await req.json()

    if (!dog_name || !date_time) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    await transporter.sendMail({
      from: `"Mung Mung's Website" <${process.env.GMAIL_USER}>`,
      to: ADMIN_EMAIL,
      subject: `🐶 New Grooming Appointment Request - ${dog_name}`,
      html: `
        <h2>New Appointment Request</h2>
        
        <p><strong>Date:</strong> ${formatDateTime(date_time)}</p>
        <p><strong>Dog:</strong> ${dog_name}</p>
        <p><strong>Service:</strong> ${service}</p>
        
        <hr />
        

        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>KakaoId:</strong> ${kakaoid}</p>

        ${
          notes
            ? `<p><strong>Notes:</strong><br/>${notes}</p>`
            : ''
        }

        <br/>
      `,
    })

    return NextResponse.json({
      success: true,
    })
  } catch (err) {
    console.error('Admin email error:', err)

    return NextResponse.json(
      { error: 'Failed to send admin notification' },
      { status: 500 }
    )
  }
}