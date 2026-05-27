import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,   // your.email@gmail.com
    pass: process.env.GMAIL_PASS,   // 16-char app password, not your real password
  },
})

const SUBJECTS: Record<string, string> = {
  confirmed: '✅ Your appointment is confirmed! / 예약이 확정되었습니다',
  declined:  '❌ Your booking was declined / 예약이 거절되었습니다',
  cancelled: 'Your appointment has been cancelled / 예약이 취소되었습니다',
}

const MESSAGES: Record<string, (dogName: string, date: string, time: string) => string> = {
  confirmed: (dogName, date, time) => `
    <p>Hi there!</p>
    <p>Great news — your grooming appointment for <strong>${dogName}</strong> on <strong>${date} at ${time}</strong> has been <strong>confirmed</strong>. We look forward to seeing you!</p>
    <p>If you need to make any changes, please contact us as soon as possible.</p>

    <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />

    <p>안녕하세요!</p>
    <p><strong>${dogName}</strong>의 미용 예약이 <strong>${date} ${time}</strong>으로 <strong>확정</strong>되었습니다. 곧 만나요!</p>
    <p>변경이 필요하신 경우 가능한 빨리 연락 주세요.</p>
  `,
  declined: (dogName, date, time) => `
    <p>Hi there,</p>
    <p>Unfortunately, we're unable to accommodate your grooming booking for <strong>${dogName}</strong> on <strong>${date} at ${time}</strong>.</p>
    <p>We're sorry for the inconvenience. Please feel free to book another time that works for you.</p>

    <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />

    <p>안녕하세요,</p>
    <p>죄송하지만 <strong>${date} ${time}</strong>에 예약하신 <strong>${dogName}</strong>의 미용 예약을 받기 어려운 상황입니다.</p>
    <p>불편을 드려 죄송합니다. 다른 시간에 다시 예약해 주세요.</p>
  `,
  cancelled: (dogName, date, time) => `
    <p>Hi there,</p>
    <p>Your grooming appointment for <strong>${dogName}</strong> on <strong>${date} at ${time}</strong> has been <strong>cancelled</strong>.</p>
    <p>If this was unexpected, please get in touch with us directly.</p>

    <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />

    <p>안녕하세요,</p>
    <p><strong>${date} ${time}</strong>에 예정된 <strong>${dogName}</strong>의 미용 예약이 <strong>취소</strong>되었습니다.</p>
    <p>문의 사항이 있으시면 저희에게 직접 연락 주세요.</p>
  `,
}

export async function POST(req: Request) {
  try {
    const { email, dog_name, date, time, status } = await req.json()

    if (!email || !status || !SUBJECTS[status]) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const subject = SUBJECTS[status]
    const html = MESSAGES[status]?.(dog_name, date, time)

    if (!html) {
      return NextResponse.json({ error: 'Unknown status' }, { status: 400 })
    }

    await transporter.sendMail({
    from: `"Mung Mung's Grooming" <${process.env.GMAIL_USER}>`,
    to: email,
    subject,
    html,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Email error:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}