// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface DBService {
  id: number
  name_eng: string
  name_kor: string
  duration: number
  desc_eng: string
  desc_kor: string
  sm_price: number
  md_price: number
  lg_price: number
  icon: string
  slots: number
  needs_style: boolean
  order: number
}

export interface Service {
  id: number
  name: string
  description: string
  duration: number
  price: number
  icon: string
  slots: number
  needs_style: boolean
  order: number
}

type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'declined'

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

export interface DBGroomingStyle {
  id: number
  name_kor: string
  desc_kor: string
  name_eng: string
  desc_eng: string
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
  dogSize?: string | null
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
  status: BookingStatus
}

export interface User {
  id: string
  name: string
  email: string
}