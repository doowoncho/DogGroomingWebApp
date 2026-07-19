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

export async function POST(req: Request) {
  try {
    const {
      service,
      // email,
      phone,
      dog_name,
      date,
      time,
      notes,
    } = await req.json()

    if (!dog_name || !date || !time) {
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
        
        <p><strong>Phone:</strong> ${phone ?? 'N/A'}</p>

        <hr />

        <p><strong>Dog:</strong> ${dog_name}</p>
        <p><strong>Service:</strong> ${service}</p>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Time:</strong> ${time}</p>

        ${
          notes
            ? `<p><strong>Notes:</strong><br/>${notes}</p>`
            : ''
        }

        <br/>

        <p>Open admin dashboard to approve or decline.</p>
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