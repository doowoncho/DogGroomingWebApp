// jest.setup.js
import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'
import { ReadableStream, TransformStream } from 'stream/web'
import { MessagePort, MessageChannel } from 'worker_threads'

Object.assign(global, {
  TextEncoder,
  TextDecoder,
  ReadableStream,
  TransformStream,
  MessagePort,
  MessageChannel,
})

const { Request, Response, Headers, fetch } = require('undici')
Object.assign(global, { Request, Response, Headers, fetch })

// ─── Global mocks ───────────────────────────────────────────────────────────
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}))

jest.mock('@/lib/rate-limit', () => ({
  bookingLimiter: { limit: jest.fn().mockResolvedValue({ success: true, limit: 5, remaining: 4, reset: Date.now() + 60000 }) },
  dogLimiter: { limit: jest.fn().mockResolvedValue({ success: true, limit: 5, remaining: 4, reset: Date.now() + 60000 }) },
  browseLimiter: { limit: jest.fn().mockResolvedValue({ success: true, limit: 30, remaining: 29, reset: Date.now() + 60000 }) },
}))

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

// ─── Global reset ────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks()
})