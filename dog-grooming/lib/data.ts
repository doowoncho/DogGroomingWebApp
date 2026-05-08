import type { Service, DogSizeOption, Breed } from '@/types'

export const SERVICES: Service[] = [
  { id: 'bath',  name: 'Bath & brush',  duration: '60 min',  price: '$45',  icon: 'ti-droplet'   },
  { id: 'groom', name: 'Full groom',    duration: '120 min', price: '$75',  icon: 'ti-scissors'  },
  { id: 'spa',   name: 'Spa package',   duration: '150 min', price: '$110', icon: 'ti-sparkles'  },
  { id: 'nail',  name: 'Nail trim',     duration: '20 min',  price: '$20',  icon: 'ti-heart'     },
]

export const DOG_SIZES: DogSizeOption[] = [
  { id: 'small',  label: 'Small',       weight: 'Under 20 lbs' },
  { id: 'medium', label: 'Medium',      weight: '20 – 50 lbs'  },
  { id: 'large',  label: 'Large',       weight: '50 – 90 lbs'  },
  { id: 'xlarge', label: 'Extra large', weight: '90+ lbs'      },
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
