// __tests__/styles-route.test.ts

/**
 * @jest-environment node
 */

import { GET } from '@/app/api/styles/route'

const mockSelect = jest.fn()

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: mockSelect,
    })),
  })),
}))

describe('Styles API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns styles successfully', async () => {
    mockSelect.mockResolvedValue({
      data: [
        {
          id: 1,
          name: 'Poodle Cut',
        },
      ],
      error: null,
    })

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.styles).toHaveLength(1)
    expect(body.styles[0].name).toBe('Poodle Cut')
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