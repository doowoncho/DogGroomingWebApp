/// <reference types="jest" />

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))


jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}))

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { POST, GET } from './route'

function mockPostSupabase({
  existingBookings = [],
  insertError = null,
  insertData = { id: 'booking-1' },
  createUserError = null,
}: any = {}) {
  const mockSingle = jest.fn().mockResolvedValue({
    data: insertData,
    error: insertError,
  })

  const mockSelectInsert = jest.fn().mockReturnValue({
    single: mockSingle,
  })

  const mockInsert = jest.fn().mockReturnValue({
    select: mockSelectInsert,
  })

  const mockEq = jest.fn().mockResolvedValue({
    data: existingBookings,
  })

  const mockSelect = jest.fn().mockReturnValue({
    eq: mockEq,
  })

  const mockFrom = jest.fn().mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
  })

  const mockCreateUser = jest.fn().mockResolvedValue({
    data: { user: { id: 'user-123' } },
    error: createUserError,
  })

  const mockDeleteUser = jest.fn().mockResolvedValue({})

;(createClient as jest.Mock).mockReturnValue({
  auth: {
    getUser: jest.fn().mockResolvedValue({   // ← add this
      data: { user: { id: 'user-123' } },
      error: null,
    }),
    admin: {
      createUser: mockCreateUser,
      deleteUser: mockDeleteUser,
    },
  },
  from: mockFrom,
})

  return {
    mockFrom,
    mockInsert,
    mockEq,
    mockCreateUser,
    mockDeleteUser,
  }
}

function mockGetSupabase({
  user = { id: 'user-1' },
  userError = null,
  bookings = [],
}: any = {}) {
  const mockGetUser = jest.fn().mockResolvedValue({
    data: { user },
    error: userError,
  })

  // AFTER
  const mockEq = jest.fn().mockResolvedValue({   // ← new
    data: bookings,
    error: null,
  })

  const mockSelect = jest.fn().mockReturnValue({ // ← mockReturnValue, not Resolved
    eq: mockEq,                                  // ← chain eq
  })

  const mockFrom = jest.fn().mockReturnValue({
    select: mockSelect,
  })

  const mockCookies = {
    getAll: jest.fn().mockReturnValue([]),
    setAll: jest.fn(),
  }

  ;(cookies as jest.Mock).mockReturnValue(mockCookies)

  ;(createClient as jest.Mock).mockReturnValue({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })

  return { mockGetUser, mockFrom, mockSelect }
}

describe('POST /api/bookings', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('returns 400 for invalid JSON body', async () => {
    const res = await POST(new Request('http://test', { method: 'POST', body: 'invalid' }))

    expect(res.status).toBe(400)
  })
})

it('returns 400 when required fields missing', async () => {
  const res = await POST(
    new Request('http://test', {
      method: 'POST',
      body: JSON.stringify({}),
    })
  )

  expect(res.status).toBe(400)
})

it('creates booking successfully when slot is free', async () => {
  mockPostSupabase({
    existingBookings: [],
  })

  const res = await POST(
    new Request('http://test', {
      method: 'POST',
      body: JSON.stringify({
        service_id: 'svc1',
        date: '2026-05-11',
        time: '10:00 AM',
        dog_name: 'Mochi',
        email: 'test@test.com',
        phone: '123',
      }),
    })
  )

  expect(res.status).toBe(200)

  const json = await res.json()
  expect(json.success).toBe(true)
})

it('returns 409 when slot is already booked', async () => {
  mockPostSupabase({
    existingBookings: [
      { time: '10:00 AM', duration_slots: 1 },
    ],
  })

  const res = await POST(
    new Request('http://test', {
      method: 'POST',
      body: JSON.stringify({
        service_id: 'svc1',
        date: '2026-05-11',
        time: '10:00 AM',
        dog_name: 'Mochi',
        email: 'test@test.com',
        phone: '123',
      }),
    })
  )

  expect(res.status).toBe(409)
})

it('returns 500 if insert fails', async () => {
  mockPostSupabase({
    insertError: new Error('DB error'),
  })

  const res = await POST(
    new Request('http://test', {
      method: 'POST',
      body: JSON.stringify({
        service_id: 'svc1',
        date: '2026-05-11',
        time: '10:00 AM',
        dog_name: 'Mochi',
        email: 'test@test.com',
        phone: '123',
      }),
    })
  )

  expect(res.status).toBe(500)
})

describe('GET /api/bookings', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('returns 401 if not authenticated', async () => {
    mockGetSupabase({
      user: null,
      userError: new Error('No user'),
    })

    const res = await GET()

    expect(res.status).toBe(401)
  })
})

it('returns user bookings', async () => {
  mockGetSupabase({
    user: { id: 'user-1' },
    bookings: [
      { id: 1, time: '10:00 AM' },
      { id: 2, time: '2:00 PM' },
    ],
  })

  const res = await GET()

  const json = await res.json()

  expect(json.bookings).toHaveLength(2)
})