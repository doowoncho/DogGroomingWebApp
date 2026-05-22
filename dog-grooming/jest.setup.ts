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