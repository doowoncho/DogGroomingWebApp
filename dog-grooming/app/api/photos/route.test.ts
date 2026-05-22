/// <reference types="jest" />

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@supabase/supabase-js'
import { POST, GET } from './route'

const storageBucket = {
  upload: jest.fn().mockResolvedValue({
    error: null,
  }),
  getPublicUrl: jest.fn().mockReturnValue({
    data: {
      publicUrl: 'https://test.com/photo.jpg',
    },
  }),
}

const mockStorageFrom = jest.fn().mockReturnValue(storageBucket)

function mockSupabase({
  uploadError = null,
  insertError = null,
  photos = [],
}: any = {}) {
  const mockUpload = jest.fn().mockResolvedValue({
    error: uploadError,
  })

  const mockGetPublicUrl = jest.fn().mockReturnValue({
    data: {
      publicUrl: 'https://test.com/photo.jpg',
    },
  })

  const mockStorageFrom = jest.fn().mockReturnValue({
    upload: mockUpload,
    getPublicUrl: mockGetPublicUrl,
  })

  const mockInsert = jest.fn().mockResolvedValue({
    error: insertError,
  })

const mockOrder = jest.fn().mockResolvedValue({
  data: photos,
  error: null,
})

const mockEq = jest.fn().mockReturnValue({
  order: mockOrder,
})

const mockSelect = jest.fn().mockReturnValue({
  eq: mockEq,
})

const mockFrom = jest.fn().mockReturnValue({
  select: mockSelect,
})

  ;(createClient as jest.Mock).mockReturnValue({
    storage: {
      from: mockStorageFrom,
    },
    from: mockFrom,
  })

  return {
    mockUpload,
    mockInsert,
    mockStorageFrom,
    mockGetPublicUrl,
    mockEq,
  }
}

function mockRequestFormData({
  bookingId = 'booking-123',
  files = [
    new File(['test'], 'photo.jpg', { type: 'image/jpeg' }),
  ],
}: any = {}) {
  return {
    formData: jest.fn().mockResolvedValue({
      get: (key: string) => {
        if (key === 'bookingId') return bookingId
        return null
      },
      getAll: (key: string) => {
        if (key === 'files') return files
        return []
      },
    }),
  }
}

describe('POST /api/photos', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('returns 400 if missing bookingId or files', async () => {
  const req = mockRequestFormData({
    bookingId: '',
    files: [],
  })

  const res = await POST(req as any)

  expect(res.status).toBe(400)
})

it('uploads files and saves to database', async () => {
  const req = mockRequestFormData()

  const mockUpload = jest.fn().mockResolvedValue({ error: null })

  const mockGetPublicUrl = jest.fn().mockReturnValue({
    data: { publicUrl: 'https://test.com/photo.jpg' },
  })

  const storageBucket = {
    upload: mockUpload,
    getPublicUrl: mockGetPublicUrl,
  }

  const mockFromStorage = jest.fn().mockReturnValue(storageBucket)

  const mockInsert = jest.fn().mockResolvedValue({ error: null })

  ;(createClient as jest.Mock).mockReturnValue({
    storage: {
      from: mockFromStorage,
    },
    from: jest.fn().mockReturnValue({
      insert: mockInsert,
    }),
  })

  const res = await POST(req as any)

  expect(res.status).toBe(200)

  const json = await res.json()
  expect(json.success).toBe(true)

  expect(mockUpload).toHaveBeenCalled()
})

it('returns 500 if upload fails', async () => {
  const req = mockRequestFormData()

  mockSupabase({
    uploadError: new Error('upload failed'),
  })

  const res = await POST(req as any)

  expect(res.status).toBe(500)
})

it('returns 500 if DB insert fails', async () => {
  const req = mockRequestFormData()

  mockSupabase({
    insertError: new Error('db failed'),
  })

  const res = await POST(req as any)

  expect(res.status).toBe(500)
})
})

describe('GET /api/photos', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('returns 400 if bookingId missing', async () => {
  const req = new Request('http://test')

  const res = await GET(req)

  expect(res.status).toBe(400)
})

it('returns photos for booking', async () => {
  const req = new Request(
    'http://test?bookingId=booking-123'
  )

  mockSupabase({
    photos: [
      { id: 1, url: 'url1' },
      { id: 2, url: 'url2' },
    ],
  })

  const res = await GET(req)

  const json = await res.json()

  expect(json.photos).toHaveLength(2)
})

});