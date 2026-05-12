import type { Service, Breed, GroomingStyle } from '@/types'

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
