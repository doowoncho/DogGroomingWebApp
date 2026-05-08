// ─── Service ────────────────────────────────────────────────────────────────
export type ServiceId = 'bath' | 'groom' | 'spa' | 'nail'

export interface Service {
  id: ServiceId
  name: string
  duration: string
  price: string
  icon: string // Tabler icon class name
}

// ─── Dog ────────────────────────────────────────────────────────────────────
export type DogSize = 'small' | 'medium' | 'large' | 'xlarge'

export interface DogSizeOption {
  id: DogSize
  label: string
  weight: string
}

export interface Breed {
  id: string
  name: string
}

// ─── Booking ─────────────────────────────────────────────────────────────────
export interface BookingDraft {
  service: Service | null
  date: string | null
  time: string | null
  dogName: string
  notes: string
  dogSize: DogSize | null
  breedId: string | null
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export interface User {
  id: string
  name: string
  email: string
}
