import type { Service, Breed, GroomingStyle } from '@/types'

export const SERVICES: Omit<Service, 'name'>[] = [
  { id: 'bath',  duration: '60 min',  price: '$45',  icon: 'ti-droplet', slots: 1  },
  { id: 'groom', duration: '120 min', price: '$75',  icon: 'ti-scissors', slots: 2 },
  { id: 'spa',   duration: '150 min', price: '$110', icon: 'ti-sparkles', slots: 3 },
  { id: 'nail',  duration: '20 min',  price: '$20',  icon: 'ti-heart',    slots: 1 },
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

// Grooming styles
export const GROOMING_STYLES: Omit<GroomingStyle, 'name' | 'desc'>[] = [
  { id: 'short',    emoji: '✂️' },
  { id: 'fluffy',   emoji: '☁️' },
  { id: 'teddy',    emoji: '🧸' },
  { id: 'puppy',    emoji: '🐕' },
  { id: 'show',     emoji: '🏆' },
  { id: 'sanitary', emoji: '✨' },
]
