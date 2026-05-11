// ─── Service ────────────────────────────────────────────────────────────────
export type ServiceId = 'bath' | 'groom' | 'spa' | 'nail'

export interface Service {
  id: ServiceId
  name: string
  duration: string
  price: string
  icon: string // Tabler icon class name
  slots: number // Number of time slots this service occupies
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

// ─── Auth ────────────────────────────────────────────────────────────────────
export interface User {
  id: string
  name: string
  email: string
}
