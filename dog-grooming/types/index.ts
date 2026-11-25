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

export interface BookingDraft {
  serviceId: number | null
  dateTime: string | null
  dogName: string
  kakaoid: string
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
  date_time: string
  dog_name: string
  breed: string | null
  email: string
  phone: string
  kakaoid: string
  notes: string | null
  status: BookingStatus
}

export interface User {
  id: string
  name: string
  email: string
}