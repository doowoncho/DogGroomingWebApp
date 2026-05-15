// __tests__/services-route.test.ts

/**
 * @jest-environment node
 */

import { GET } from '@/app/api/services/route'

const mockSelect = jest.fn()

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: mockSelect,
    })),
  })),
}))

describe('Services API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns services successfully', async () => {
    mockSelect.mockResolvedValue({
      data: [
        {
          id: 1,
          name: 'Grooming',
        },
      ],
      error: null,
    })

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.services).toHaveLength(1)
    expect(body.services[0].name).toBe('Grooming')
  })

  it('returns 500 when supabase fails', async () => {
    mockSelect.mockResolvedValue({
      data: null,
      error: {
        message: 'Database error',
      },
    })

    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('Database error')

    consoleSpy.mockRestore()
  })
})