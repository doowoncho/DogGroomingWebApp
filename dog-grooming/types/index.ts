// ─── Service ────────────────────────────────────────────────────────────────
export type ServiceId = 'bath' | 'groom' | 'spa' | 'nail'

export interface Service {
  id: ServiceId
  name: string
  duration: string
  price: string
  icon: string
  slots: number
  needs_style: boolean
}

export interface Breed {
  id: string
  name: string
}

// ─── Grooming Styles ────────────────────────────────────────────────────────
export interface GroomingStyle {
  id: string
  name: string
  desc: string
  emoji: string
}

// ─── Booking ─────────────────────────────────────────────────────────────────
export interface BookingDraft {
  service: Service | null
  date: string | null
  time: string | null
  styleId: string | null
  photoUrl: string | null
  dogName: string
  email: string
  phone: string
  notes: string
  breed: string | null
}

export interface Booking {
  id:            string
  created_at:    string
  service_id:    ServiceId
  service_name:  string
  service_price: string
  duration_slots: number
  date:          string
  time:          string
  style_id:      string | null
  dog_name:      string
  breed:         string | null
  email:         string
  phone:         string
  notes:         string | null
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export interface User {
  id: string
  name: string
  email: string
}
