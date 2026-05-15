// __tests__/bookings-route.test.ts

/**
 * @jest-environment node
 */

import { POST, GET } from '@/app/api/bookings/route'
import { NextResponse } from 'next/server'

const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockInsert = jest.fn()
const mockSingle = jest.fn()
const mockOrder = jest.fn()

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: mockSelect,
      eq: mockEq,
      insert: mockInsert,
      order: mockOrder,
    })),
  })),
}))

describe('Bookings API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST', () => {
    it('returns 400 if body is invalid JSON', async () => {
      const req = {
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as any

      const res = await POST(req)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toBe('Invalid or empty request body')
    })

    it('returns 400 if required field is missing', async () => {
      const req = {
        json: jest.fn().mockResolvedValue({
          date: '2026-05-15',
        }),
      } as any

      const res = await POST(req)
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toBe('service_id is required')
    })

    it('returns 409 if booking slot is already taken', async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [
            {
              time: '10:00 AM',
              duration_slots: 1,
            },
          ],
        }),
      })

      const req = {
        json: jest.fn().mockResolvedValue({
          service_id: 1,
          date: '2026-05-15',
          time: '10:00 AM',
          dog_name: 'Buddy',
          email: 'test@test.com',
          phone: '1234567890',
        }),
      } as any

      const res = await POST(req)
      const body = await res.json()

      expect(res.status).toBe(409)
      expect(body.error).toBe('This time slot is no longer available')
    })

    it('creates a booking successfully', async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [],
        }),
      })

      mockInsert.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 1,
              dog_name: 'Buddy',
            },
            error: null,
          }),
        }),
      })

      const req = {
        json: jest.fn().mockResolvedValue({
          service_id: 1,
          date: '2026-05-15',
          time: '11:00 AM',
          dog_name: 'Buddy',
          email: 'test@test.com',
          phone: '1234567890',
        }),
      } as any

      const res = await POST(req)
      const body = await res.json()

      expect(res.status).toBe(201)
      expect(body.booking.id).toBe(1)
      expect(body.booking.dog_name).toBe('Buddy')
    })

    it('returns 500 if insert fails', async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [],
        }),
      })

      mockInsert.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: {
              message: 'Insert failed',
            },
          }),
        }),
      })

      const req = {
        json: jest.fn().mockResolvedValue({
          service_id: 1,
          date: '2026-05-15',
          time: '11:00 AM',
          dog_name: 'Buddy',
          email: 'test@test.com',
          phone: '1234567890',
        }),
      } as any

      const res = await POST(req)
      const body = await res.json()

      expect(res.status).toBe(500)
      expect(body.error).toBe('Insert failed')
    })
  })

  describe('GET', () => {
    it('returns bookings successfully', async () => {
      mockSelect.mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [
            {
              id: 1,
              dog_name: 'Buddy',
            },
          ],
          error: null,
        }),
      })

      const req = {} as Request

      const res = await GET(req)
      const body = await res.json()

      expect(body.bookings).toHaveLength(1)
      expect(body.bookings[0].dog_name).toBe('Buddy')
    })

    it('returns 500 if supabase query fails', async () => {
      mockSelect.mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: null,
          error: {
            message: 'Database error',
          },
        }),
      })

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      const req = {} as Request

      const res = await GET(req)
      const body = await res.json()

      expect(res.status).toBe(500)
      expect(body.error).toBe('Database error')

      consoleSpy.mockRestore()
    })
  })
})