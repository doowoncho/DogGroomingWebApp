/// <reference types="jest" />

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/rate-limit', () => ({
  browseLimiter: { limit: jest.fn().mockResolvedValue({ success: true }) },
}))

import { createAdminClient } from '@/utils/supabase/admin'
import { GET } from './route'

// A date that is never "today", so the same-day block doesn't kick in
const DATE = '2099-05-11'

function booking(time: string, slots: number) {
  return { date_time: `${DATE}T${time}:00`, services: { slots } }
}

function mockSupabase(data: any[], error: any = null) {
  const mockIn = jest.fn().mockResolvedValue({ data, error })
  const mockLt = jest.fn().mockReturnValue({ in: mockIn })
  const mockGte = jest.fn().mockReturnValue({ lt: mockLt })
  const mockSelect = jest.fn().mockReturnValue({ gte: mockGte })
  const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })
  ;(createAdminClient as jest.Mock).mockReturnValue({ from: mockFrom })
  return { mockFrom, mockSelect, mockGte, mockLt, mockIn }
}

async function getSlots(query = '') {
  const res = await GET(new Request(`http://localhost/api/availability?date=${DATE}${query}`))
  const { slots } = await res.json()
  return (time: string) => slots.find((s: any) => s.time === time).available
}

describe('GET /api/availability', () => {
  it('returns 400 when date is missing', async () => {
    const res = await GET(new Request('http://localhost/api/availability'))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'date required' })
  })

  it('returns all 8 slots as available when no bookings exist', async () => {
    mockSupabase([])
    const res = await GET(new Request(`http://localhost/api/availability?date=${DATE}`))
    expect(res.status).toBe(200)
    const { slots } = await res.json()
    expect(slots).toHaveLength(8)
    expect(slots.every((s: any) => s.available)).toBe(true)
  })

  it('blocks 1 slot for a 1-slot booking', async () => {
    mockSupabase([booking('09:00', 1)])
    const available = await getSlots()
    expect(available('9:00 AM')).toBe(false)
    expect(available('10:00 AM')).toBe(true)
  })

  it('blocks 3 consecutive slots for a 3-slot booking', async () => {
    mockSupabase([booking('14:00', 3)])
    const available = await getSlots()
    expect(available('2:00 PM')).toBe(false)
    expect(available('3:00 PM')).toBe(false)
    expect(available('4:00 PM')).toBe(false)
    expect(available('5:00 PM')).toBe(true)
  })

  it('blocks a slot before a booking if the incoming service would overlap it', async () => {
    mockSupabase([booking('10:00', 2)])
    const available = await getSlots('&slots=2')
    expect(available('9:00 AM')).toBe(false)
    expect(available('10:00 AM')).toBe(false)
    expect(available('11:00 AM')).toBe(false)
    expect(available('12:00 PM')).toBe(true)
  })

  it('handles multiple bookings on the same day', async () => {
    mockSupabase([booking('09:00', 1), booking('11:00', 2)])
    const available = await getSlots()
    expect(available('9:00 AM')).toBe(false)
    expect(available('10:00 AM')).toBe(true)
    expect(available('11:00 AM')).toBe(false)
    expect(available('12:00 PM')).toBe(false)
    expect(available('2:00 PM')).toBe(true)
  })

  it('only counts pending/confirmed bookings as holding a slot', async () => {
    const { mockFrom, mockSelect, mockGte, mockLt, mockIn } = mockSupabase([])
    await GET(new Request(`http://localhost/api/availability?date=${DATE}`))

    expect(mockFrom).toHaveBeenCalledWith('bookings')
    expect(mockSelect).toHaveBeenCalledWith('date_time, services(slots)')
    expect(mockGte).toHaveBeenCalledWith('date_time', `${DATE}T00:00:00`)
    expect(mockLt).toHaveBeenCalledWith('date_time', `${DATE}T23:59:59`)
    expect(mockIn).toHaveBeenCalledWith('status', ['pending', 'confirmed'])
  })

  it('returns 500 on a database error', async () => {
    mockSupabase([], { message: 'boom' })
    const res = await GET(new Request(`http://localhost/api/availability?date=${DATE}`))
    expect(res.status).toBe(500)
  })
})
