/// <reference types="jest" />

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@/utils/supabase/server'
import { GET } from './route'

const DATE = 'May 11, 2026'
const ENCODED_DATE = 'May%2011,%202026'

// Helper to build the joined data shape
function booking(time: string, slots: number) {
  return { time, services: { slots } }
}

function mockSupabase(data: any[], error: any = null) {
  const mockEq = jest.fn().mockResolvedValue({ data, error })
  const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
  const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })
  ;(createClient as jest.Mock).mockReturnValue({ from: mockFrom })
  return { mockFrom, mockSelect, mockEq }
}

describe('GET /api/availability', () => {

  // ─── Input validation ────────────────────────────────────────────────────
  it('returns 400 when date is missing', async () => {
    const res = await GET(new Request('http://localhost/api/availability'))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'date required' })
  })

  // ─── No bookings ─────────────────────────────────────────────────────────
  it('returns all 8 slots as available when no bookings exist', async () => {
    mockSupabase([])

    const res = await GET(new Request(`http://localhost/api/availability?date=${ENCODED_DATE}`))
    expect(res.status).toBe(200)

    const { slots } = await res.json()
    expect(slots).toHaveLength(8)
    expect(slots.every((s: any) => s.available)).toBe(true)
  })

  // ─── Single slot booking ─────────────────────────────────────────────────
  it('blocks 1 slot for a 1-slot booking', async () => {
    mockSupabase([booking('9:00 AM', 1)])

    const res = await GET(new Request(`http://localhost/api/availability?date=${ENCODED_DATE}`))
    const { slots } = await res.json()

    expect(slots.find((s: any) => s.time === '9:00 AM').available).toBe(false)
    expect(slots.find((s: any) => s.time === '10:00 AM').available).toBe(true)
  })

  it('blocks 3 consecutive slots for a 3-slot booking', async () => {
    mockSupabase([booking('2:00 PM', 3)])

    const res = await GET(new Request(`http://localhost/api/availability?date=${ENCODED_DATE}`))
    const { slots } = await res.json()

    expect(slots.find((s: any) => s.time === '2:00 PM').available).toBe(false)
    expect(slots.find((s: any) => s.time === '3:00 PM').available).toBe(false)
    expect(slots.find((s: any) => s.time === '4:00 PM').available).toBe(false)
    expect(slots.find((s: any) => s.time === '5:00 PM').available).toBe(true)
  })

   // ─── Overlap detection ────────────────────────────────────────────────────
  it('blocks slot before a booking if incoming service would overflow into it', async () => {
    // groom (2 slots) at 10:00 AM occupies 10:00 AM and 11:00 AM
    // incoming 2-slot service at 9:00 AM would run into 10:00 AM → blocked
    mockSupabase([booking('10:00 AM', 2)])
    const res = await GET(new Request(`http://localhost/api/availability?date=${ENCODED_DATE}&slots=${2}`))
    const { slots } = await res.json()

    expect(slots.find((s: any) => s.time === '9:00 AM').available).toBe(false)  // would overflow
    expect(slots.find((s: any) => s.time === '10:00 AM').available).toBe(false) // occupied
    expect(slots.find((s: any) => s.time === '11:00 AM').available).toBe(false) // occupied
    expect(slots.find((s: any) => s.time === '12:00 PM').available).toBe(true)  // free
  })

  // ─── Multiple bookings ───────────────────────────────────────────────────
  it('handles multiple bookings on the same day', async () => {
    mockSupabase([
      booking('9:00 AM',  1),
      booking('11:00 AM', 2),
    ])

    const res = await GET(new Request(`http://localhost/api/availability?date=${ENCODED_DATE}`))
    const { slots } = await res.json()

    expect(slots.find((s: any) => s.time === '9:00 AM').available).toBe(false)
    expect(slots.find((s: any) => s.time === '10:00 AM').available).toBe(true)
    expect(slots.find((s: any) => s.time === '11:00 AM').available).toBe(false)
    expect(slots.find((s: any) => s.time === '12:00 PM').available).toBe(false)
    expect(slots.find((s: any) => s.time === '2:00 PM').available).toBe(true)
  })

  it('does not overflow past the last slot', async () => {
    mockSupabase([booking('5:00 PM', 3)])

    const res = await GET(new Request(`http://localhost/api/availability?date=${ENCODED_DATE}`))
    const { slots } = await res.json()

    expect(slots.find((s: any) => s.time === '5:00 PM').available).toBe(false)
    expect(slots).toHaveLength(8)
  })

  // ─── DB call verification ────────────────────────────────────────────────
  it('queries the correct table, columns, and date', async () => {
    const { mockFrom, mockSelect, mockEq } = mockSupabase([])

    await GET(new Request(`http://localhost/api/availability?date=${ENCODED_DATE}`))

    expect(mockFrom).toHaveBeenCalledWith('bookings')
    expect(mockSelect).toHaveBeenCalledWith('time, services(slots)')
    expect(mockEq).toHaveBeenCalledWith('date', DATE)
  })
})