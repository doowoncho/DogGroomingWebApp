/// <reference types="jest" />

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}))

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/rate-limit', () => ({
  bookingLimiter: { limit: jest.fn().mockResolvedValue({ success: true, limit: 5, remaining: 4, reset: Date.now() + 60000 }) },
  dogLimiter: { limit: jest.fn().mockResolvedValue({ success: true, limit: 5, remaining: 4, reset: Date.now() + 60000 }) },
  browseLimiter: { limit: jest.fn().mockResolvedValue({ success: true, limit: 30, remaining: 29, reset: Date.now() + 60000 }) },
}))

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { GET, POST, PATCH, DELETE } from './route'

const MOCK_USER = { id: 'user-123' }
const MOCK_DOG = { id: 'dog-456', user_id: 'user-123', name: 'Mochi', breed: 'Shiba Inu' }

// ─── Mock factory ─────────────────────────────────────────────────────────────
function mockSupabase({
  user = MOCK_USER,
  userError = null,
  queryData = null,
  queryError = null,
}: {
  user?: any
  userError?: any
  queryData?: any
  queryError?: any
} = {}) {
  // Chainable query builder — each method returns `this` until the terminal await
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: queryData, error: queryError }),
  }

  // Non-single terminal (used by GET and DELETE)
  chain.eq.mockImplementation(() => {
    // Return a thenable so `await supabase.from(...).select(...).eq(...)` resolves
    const thenable = {
      ...chain,
      then: (resolve: any) =>
        Promise.resolve({ data: queryData, error: queryError }).then(resolve),
    }
    return thenable
  })

  const mockFrom = jest.fn().mockReturnValue(chain)

  ;(createClient as jest.Mock).mockReturnValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user },
        error: userError,
      }),
    },
    from: mockFrom,
  })

  ;(cookies as jest.Mock).mockResolvedValue({
    getAll: jest.fn().mockReturnValue([]),
    set: jest.fn(),
  })

  return { chain, mockFrom }
}

function makeRequest(body?: object, method = 'POST') {
  return new Request('http://localhost/api/dogs', {
    method,
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('GET /api/dogs', () => {

  it('returns 401 when not authenticated', async () => {
    mockSupabase({ user: null, userError: { message: 'not auth' } })
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Not authenticated' })
  })

  it('returns the user dogs on success', async () => {
    mockSupabase({ queryData: [MOCK_DOG] })
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ dogs: [MOCK_DOG] })
  })

  it('returns 500 when the db query fails', async () => {
    mockSupabase({ queryError: { message: 'db error' } })
    const res = await GET(makeRequest())
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'db error' })
  })

  it('queries the dogs table filtered by user_id', async () => {
    const { mockFrom, chain } = mockSupabase({ queryData: [MOCK_DOG] })
    await GET(makeRequest())
    expect(mockFrom).toHaveBeenCalledWith('dogs')
    expect(chain.select).toHaveBeenCalledWith('*')
    expect(chain.eq).toHaveBeenCalledWith('user_id', MOCK_USER.id)
  })
})

describe('POST /api/dogs', () => {
  it('returns 401 when not authenticated', async () => {
    mockSupabase({ user: null, userError: { message: 'not auth' } })
    const res = await POST(makeRequest({ name: 'Mochi', breed: 'Shiba Inu' }))
    expect(res.status).toBe(401)
  })

  it('returns the new dog on success', async () => {
    mockSupabase({ queryData: MOCK_DOG })
    const res = await POST(makeRequest({ name: 'Mochi', breed: 'Shiba Inu' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ dog: MOCK_DOG })
  })

  it('inserts with the correct user_id, name, and breed', async () => {
    const { mockFrom, chain } = mockSupabase({ queryData: MOCK_DOG })
    await POST(makeRequest({ name: 'Mochi', breed: 'Shiba Inu' }))
    expect(mockFrom).toHaveBeenCalledWith('dogs')
    expect(chain.insert).toHaveBeenCalledWith({
      user_id: MOCK_USER.id,
      name: 'Mochi',
      breed: 'Shiba Inu',
    })
  })

  it('returns 400 when insert fails', async () => {
    mockSupabase({ queryError: { message: 'insert failed' } })
    const res = await POST(makeRequest({ name: 'Mochi', breed: 'Shiba Inu' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'insert failed' })
  })
})

describe('PATCH /api/dogs', () => {

  it('returns 401 when not authenticated', async () => {
    mockSupabase({ user: null })
    const res = await PATCH(makeRequest({ id: 'dog-456', name: 'Mochi', breed: 'Shiba Inu' }, 'PATCH'))
    expect(res.status).toBe(401)
  })

  it('returns the updated dog on success', async () => {
    mockSupabase({ queryData: { ...MOCK_DOG, name: 'Mochi Updated' } })
    const res = await PATCH(makeRequest({ id: 'dog-456', name: 'Mochi Updated', breed: 'Shiba Inu' }, 'PATCH'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ dog: { ...MOCK_DOG, name: 'Mochi Updated' } })
  })

  it('scopes the update to the authenticated user_id', async () => {
    const { chain } = mockSupabase({ queryData: MOCK_DOG })
    await PATCH(makeRequest({ id: 'dog-456', name: 'Mochi', breed: 'Shiba Inu' }, 'PATCH'))
    expect(chain.eq).toHaveBeenCalledWith('id', 'dog-456')
    expect(chain.eq).toHaveBeenCalledWith('user_id', MOCK_USER.id)
  })

  it('returns 400 when update fails', async () => {
    mockSupabase({ queryError: { message: 'update failed' } })
    const res = await PATCH(makeRequest({ id: 'dog-456', name: 'Mochi', breed: 'Shiba Inu' }, 'PATCH'))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'update failed' })
  })
})

describe('DELETE /api/dogs', () => {

  it('returns 401 when not authenticated', async () => {
    mockSupabase({ user: null })
    const res = await DELETE(makeRequest({ id: 'dog-456' }, 'DELETE'))
    expect(res.status).toBe(401)
  })

  it('returns success:true on a valid delete', async () => {
    mockSupabase({ queryData: null, queryError: null })
    const res = await DELETE(makeRequest({ id: 'dog-456' }, 'DELETE'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
  })

  it('scopes the delete to the authenticated user_id', async () => {
    const { chain } = mockSupabase()
    await DELETE(makeRequest({ id: 'dog-456' }, 'DELETE'))
    expect(chain.eq).toHaveBeenCalledWith('id', 'dog-456')
    expect(chain.eq).toHaveBeenCalledWith('user_id', MOCK_USER.id)
  })

  it('returns 400 when delete fails', async () => {
    mockSupabase({ queryError: { message: 'delete failed' } })
    const res = await DELETE(makeRequest({ id: 'dog-456' }, 'DELETE'))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'delete failed' })
  })
})