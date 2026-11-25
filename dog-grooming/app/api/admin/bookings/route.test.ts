/// <reference types="jest" />

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { GET, PATCH, DELETE } from './route'

function mockSession({ user, isAdmin }: { user: { id: string } | null; isAdmin?: boolean }) {
  ;(createClient as jest.Mock).mockReturnValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: isAdmin === undefined ? null : { is_admin: isAdmin } }),
        }),
      }),
    }),
  })
}

describe('/api/admin/bookings auth', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 for anonymous callers and never touches the service-role client', async () => {
    mockSession({ user: null })
    const res = await GET()
    expect(res.status).toBe(401)
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('returns 403 for signed-in non-admins on every method', async () => {
    mockSession({ user: { id: 'u1' }, isAdmin: false })
    const patchReq = new Request('http://test', { method: 'PATCH', body: JSON.stringify({ id: 'b1', status: 'confirmed' }) })
    const deleteReq = new Request('http://test?id=b1', { method: 'DELETE' })

    expect((await GET()).status).toBe(403)
    expect((await PATCH(patchReq)).status).toBe(403)
    expect((await DELETE(deleteReq)).status).toBe(403)
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('lets admins through', async () => {
    mockSession({ user: { id: 'admin' }, isAdmin: true })
    ;(createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: [{ id: 'b1' }], error: null }),
      }),
    })

    const res = await GET()
    expect(res.status).toBe(200)
    expect((await res.json()).bookings).toHaveLength(1)
  })
})
