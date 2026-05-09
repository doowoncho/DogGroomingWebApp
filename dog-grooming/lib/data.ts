import type { Service, Breed, GroomingStyle } from '@/types'

export const SERVICES: Omit<Service, 'name'>[] = [
  { id: 'bath',  duration: '60 min',  price: '$45',  icon: 'ti-droplet'  },
  { id: 'groom', duration: '120 min', price: '$75',  icon: 'ti-scissors' },
  { id: 'spa',   duration: '150 min', price: '$110', icon: 'ti-sparkles' },
  { id: 'nail',  duration: '20 min',  price: '$20',  icon: 'ti-heart'    },
]

export const BREEDS: Breed[] = [
  { id: 'golden',    name: 'Golden Retriever' },
  { id: 'labrador',  name: 'Labrador'         },
  { id: 'poodle',    name: 'Poodle'           },
  { id: 'bulldog',   name: 'Bulldog'          },
  { id: 'shih-tzu',  name: 'Shih Tzu'        },
  { id: 'beagle',    name: 'Beagle'           },
  { id: 'husky',     name: 'Husky'            },
  { id: 'dachshund', name: 'Dachshund'        },
  { id: 'boxer',     name: 'Boxer'            },
  { id: 'corgi',     name: 'Corgi'            },
]

// Time slots — in a real app these come from the API based on selected date
export const TIME_SLOTS: { time: string; available: boolean }[] = [
  { time: '9:00 AM',  available: true  },
  { time: '10:00 AM', available: false },
  { time: '11:00 AM', available: true  },
  { time: '12:00 PM', available: false },
  { time: '2:00 PM',  available: true  },
  { time: '3:00 PM',  available: true  },
  { time: '4:00 PM',  available: true  },
  { time: '5:00 PM',  available: false },
]

// Grooming styles
export const GROOMING_STYLES: Omit<GroomingStyle, 'name' | 'desc'>[] = [
  { id: 'short',    emoji: '✂️' },
  { id: 'fluffy',   emoji: '☁️' },
  { id: 'teddy',    emoji: '🧸' },
  { id: 'puppy',    emoji: '🐕' },
  { id: 'show',     emoji: '🏆' },
  { id: 'sanitary', emoji: '✨' },
]
