/// <reference types="jest" />

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@/utils/supabase/server'
import { POST } from './route'

function mockSupabase({
  user = { id: 'user-123' },
  authError = null,
  dogError = null,
  bookingError = null,
}: any = {}) {
  const mockCreateUser = jest.fn().mockResolvedValue({
    data: { user },
    error: authError,
  })

  const mockDeleteUser = jest.fn().mockResolvedValue({})

  const mockInsert = jest.fn().mockResolvedValue({ error: dogError })
  const mockUpdate = jest.fn().mockResolvedValue({ error: bookingError })

  const mockEq = jest.fn().mockReturnValue({ update: mockUpdate })
  const mockFrom = jest.fn().mockReturnValue({
    update: mockUpdate,
    insert: mockInsert,
    eq: mockEq,
  })

  ;(createClient as jest.Mock).mockReturnValue({
    auth: {
      admin: {
        createUser: mockCreateUser,
        deleteUser: mockDeleteUser,
      },
    },
    from: mockFrom,
  })

  return {
    mockCreateUser,
    mockDeleteUser,
    mockInsert,
    mockUpdate,
    mockEq,
  }
}

describe('POST /api/user-create', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('creates user and dog successfully', async () => {
  mockSupabase()

  const res = await POST(
    new Request('http://localhost/api', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@test.com',
        password: '123456',
        phone: '123',
        dogName: 'Mochi',
        breed: 'Shiba',
      }),
    })
  )

  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ success: true })
})

it('deletes user if dog insert fails', async () => {
  const { mockDeleteUser } = mockSupabase({
    dogError: new Error('Dog insert failed'),
  })

  await POST(
    new Request('http://localhost/api', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@test.com',
        password: '123456',
        dogName: 'Mochi',
        breed: 'Shiba',
      }),
    })
  )

  expect(mockDeleteUser).toHaveBeenCalled()
})

it('returns 400 when auth fails', async () => {
  mockSupabase({
    authError: { message: 'Auth failed' },
  })

  const res = await POST(
    new Request('http://localhost/api', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@test.com',
        password: '123456',
        dogName: 'Mochi',
        breed: 'Shiba',
      }),
    })
  )

  expect(res.status).toBe(400)
  expect(await res.json()).toEqual({ error: 'Auth failed' })
})
})