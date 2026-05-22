// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface Service {
  id: number
  name: string
  duration: string
  price: number
  icon: string
  slots: number
 needs_style: boolean
}

export interface Breed {
  id: string
  name: string
}

export interface Dogs {
  id: string
  name: string
  breed: string | null
}

export interface GroomingStyle {
  id: number
  name: string
  desc: string
  emoji: string
}

export interface BookingDraft {
  serviceId: number | null
  date: string | null
  time: string | null
  styleId: number | null
  photoUrls: string[]
  dogName: string
  email: string
  phone: string
  notes: string
  breed: string | null
  bookingId?: string | null
  user_id?: string | null
}

export interface Booking {
  id: string
  created_at: string
  service_id: number
  service_name: string
  service_price: number
  duration_slots: number
  date: string
  time: string
  style_id: number | null
  dog_name: string
  breed: string | null
  email: string
  phone: string
  notes: string | null
}

export interface User {
  id: string
  name: string
  email: string
}