/// <reference types="jest" />

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}))

jest.mock('@/lib/rate-limit', () => ({
  bookingLimiter: { limit: jest.fn().mockResolvedValue({ success: true }) },
}))

jest.mock('@/lib/notifyAdmin', () => ({
  notifyAdmin: jest.fn().mockResolvedValue(undefined),
}))

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { cookies } from 'next/headers'
import { notifyAdmin } from '@/lib/notifyAdmin'
import { POST, GET } from './route'

const DATE = '2099-05-11'

function existing(time: string, slots: number) {
  return { date_time: `${DATE}T${time}:00`, services: { slots } }
}

function mockPostSupabase({
  existingBookings = [] as any[],
  service = { slots: 1, name_eng: 'Full groom' } as any,
  insertError = null as any,
  insertData = { id: 'booking-1', dog_name: 'Mochi', phone: '123', date_time: `${DATE}T10:00:00` } as any,
} = {}) {
  const mockIn = jest.fn().mockResolvedValue({ data: existingBookings, error: null })
  const mockInsert = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({ data: insertData, error: insertError }),
    }),
  })

  const mockFrom = jest.fn((table: string) => {
    if (table === 'services') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: service, error: null }),
          }),
        }),
      }
    }
    return {
      select: jest.fn().mockReturnValue({
        gte: jest.fn().mockReturnValue({ lt: jest.fn().mockReturnValue({ in: mockIn }) }),
      }),
      insert: mockInsert,
    }
  })

  ;(createAdminClient as jest.Mock).mockReturnValue({ from: mockFrom })
  ;(createClient as jest.Mock).mockReturnValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }),
    },
    from: jest.fn(() => { throw new Error('POST must not use the public client for table access') }),
  })

  return { mockFrom, mockInsert, mockIn }
}

function postBooking(overrides: Record<string, unknown> = {}) {
  return POST(
    new Request('http://test', {
      method: 'POST',
      body: JSON.stringify({
        service_id: 1,
        date_time: `${DATE}T10:00:00`,
        dog_name: 'Mochi',
        email: 'test@test.com',
        phone: '123',
        ...overrides,
      }),
    })
  )
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
  beforeEach(() => jest.clearAllMocks())

  it('returns 400 for invalid JSON body', async () => {
    const res = await POST(new Request('http://test', { method: 'POST', body: 'invalid' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when required fields missing', async () => {
    const res = await POST(new Request('http://test', { method: 'POST', body: JSON.stringify({}) }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for a time that is not a bookable slot', async () => {
    mockPostSupabase()
    const res = await postBooking({ date_time: `${DATE}T13:00:00` })
    expect(res.status).toBe(400)
  })

  it('creates booking and emails the admin when the slot is free', async () => {
    const { mockInsert } = mockPostSupabase()
    const res = await postBooking({ user_id: 'someone-else', status: 'confirmed' })

    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
    // user_id comes from the session and status is always pending, whatever the body says
    expect(mockInsert).toHaveBeenCalledWith([expect.objectContaining({ user_id: 'user-123', status: 'pending' })])
    expect(notifyAdmin).toHaveBeenCalledWith(expect.objectContaining({ dog_name: 'Mochi', service: 'Full groom' }))
  })

  it('still succeeds if the admin email fails', async () => {
    mockPostSupabase()
    ;(notifyAdmin as jest.Mock).mockRejectedValueOnce(new Error('smtp down'))
    const res = await postBooking()
    expect(res.status).toBe(200)
  })

  it('only counts pending/confirmed bookings as holding a slot', async () => {
    const { mockIn } = mockPostSupabase()
    await postBooking()
    expect(mockIn).toHaveBeenCalledWith('status', ['pending', 'confirmed'])
  })

  it('returns 409 when the start slot is already booked', async () => {
    const { mockInsert } = mockPostSupabase({ existingBookings: [existing('10:00', 1)] })
    const res = await postBooking()
    expect(res.status).toBe(409)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns 409 when an earlier multi-slot booking runs into this time', async () => {
    mockPostSupabase({ existingBookings: [existing('09:00', 2)] })
    const res = await postBooking()
    expect(res.status).toBe(409)
  })

  it('returns 409 when this multi-slot service would run into a later booking', async () => {
    mockPostSupabase({ service: { slots: 2, name_eng: 'Full groom' }, existingBookings: [existing('11:00', 1)] })
    const res = await postBooking()
    expect(res.status).toBe(409)
  })

  it('returns 400 for an unknown service', async () => {
    mockPostSupabase({ service: null })
    const res = await postBooking()
    expect(res.status).toBe(400)
  })

  it('returns 409 if the database overlap constraint rejects the insert', async () => {
    mockPostSupabase({ insertError: { code: '23P01', message: 'conflicting key value violates exclusion constraint' } })
    const res = await postBooking()
    expect(res.status).toBe(409)
  })

  it('returns 500 if insert fails', async () => {
    mockPostSupabase({ insertError: new Error('DB error') })
    const res = await postBooking()
    expect(res.status).toBe(500)
  })
})

describe('GET /api/bookings', () => {

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