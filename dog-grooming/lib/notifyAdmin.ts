import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
})

const ADMIN_EMAIL = process.env.ADMIN_EMAIL

function formatDateTime(dateTime: string) {
  const d = new Date(dateTime)
  if (isNaN(d.getTime())) return dateTime
  const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const timeLabel = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${dateLabel} · ${timeLabel}`
}

export async function notifyAdmin({
  service,
  phone,
  dog_name,
  date_time,
  notes,
  kakaoid,
  isEdit = false,
  breed
}: {
  service: string
  phone: string
  dog_name: string
  date_time: string
  notes?: string | null
  kakaoid?: string | null
  isEdit?: boolean
  breed?: string
}) {

  const subject = isEdit
    ? `✏️ Updated Grooming Appointment Request - ${dog_name}`
    : `🐶 New Grooming Appointment Request - ${dog_name}`

  const heading = isEdit ? 'Updated Appointment Request' : 'New Appointment Request'

  await transporter.sendMail({
    from: `"Mung Mung's Website" <${process.env.GMAIL_USER}>`,
    to: ADMIN_EMAIL,
    subject,
    html: `
      <h2>${heading}</h2>
      <p><strong>Date:</strong> ${formatDateTime(date_time)}</p>
      <p><strong>Dog:</strong> ${dog_name}</p>
      <p><strong>Breed:</strong> ${breed}</p>
      <p><strong>Service:</strong> ${service}</p>
      <hr />
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>KakaoId:</strong> ${kakaoid}</p>
      ${notes ? `<p><strong>Notes:</strong><br/>${notes}</p>` : ''}
      <br/>
    `,
  })
}