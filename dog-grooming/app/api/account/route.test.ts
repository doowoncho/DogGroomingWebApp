/// <reference types="jest" />

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

import { createAdminClient } from '@/utils/supabase/admin'
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

  // bookings.update(...).eq(...).ilike(...).is(...)
  const mockIs = jest.fn().mockResolvedValue({ error: bookingError })
  const mockIlike = jest.fn().mockReturnValue({ is: mockIs })
  const mockEq = jest.fn().mockReturnValue({ ilike: mockIlike })
  const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq })

  const mockFrom = jest.fn().mockReturnValue({
    update: mockUpdate,
    insert: mockInsert,
  })

  ;(createAdminClient as jest.Mock).mockReturnValue({
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
    mockIlike,
    mockIs,
    mockFrom,
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

it('creates a non-admin profile without the missing full_name column', async () => {
  const { mockFrom, mockInsert } = mockSupabase()

  await POST(
    new Request('http://localhost/api', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@test.com', password: '123456', fullname: 'Kim' }),
    })
  )

  expect(mockFrom).toHaveBeenCalledWith('profiles')
  expect(mockInsert).toHaveBeenCalledWith({ user_id: 'user-123', email: 'test@test.com', is_admin: false })
})

it('only links a booking with the same email that has no account yet', async () => {
  const { mockUpdate, mockEq, mockIlike, mockIs } = mockSupabase()

  await POST(
    new Request('http://localhost/api', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@test.com', password: '123456', bookingId: 'b1' }),
    })
  )

  expect(mockUpdate).toHaveBeenCalledWith({ user_id: 'user-123' })
  expect(mockEq).toHaveBeenCalledWith('id', 'b1')
  expect(mockIlike).toHaveBeenCalledWith('email', 'test@test.com')
  expect(mockIs).toHaveBeenCalledWith('user_id', null)
})
})
