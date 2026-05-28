import { render, screen, waitFor, fireEvent, act, cleanup } from '@testing-library/react'
import BookPage from '@/app/book/page'

// ─── MOCK HOOKS ──────────────────────────────────────────────────────────────
jest.mock('scheduler', () => require('scheduler/unstable_mock'))

jest.mock('@/lib/hooks/useServices', () => ({
  useServices: () => ({
    services: [
      {
        id: 1,
        name: 'Nail Trim',
        price: 50,
        slots: 1,
        needs_style: false,
        icon: 'ti-scissors',
        duration: 30,
      },
      {
        id: 2,
        name: 'Full Spa Package',
        price: 120,
        slots: 3,
        needs_style: true,
        icon: 'ti-sparkles',
        duration: 90,
      },
    ],
    loading: false,
    error: null,
  }),
}))

jest.mock('@/lib/hooks/useStyles', () => ({
  useStyles: () => ({
    styles: [{ id: 1, name: 'Cute Cut', emoji: '🐶', desc: 'Nice style' }],
    loading: false,
    error: null,
  }),
}))

jest.mock('@/components/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' }),
}))

jest.mock('@/utils/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: [] }),
    })),
  },
}))

// ─── FETCH MOCK HELPERS ───────────────────────────────────────────────────────

const availabilityResponse = () =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        slots: [
          { time: '10:00', available: true },
          { time: '11:00', available: true },
        ],
      }),
  })

const bookingResponse = (id = 123) =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ booking: { id } }),
  })

const emptyResponse = () =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
  })

const defaultFetchMock = (url: string) => {
  if (url.includes('/api/availability')) return availabilityResponse()
  if (url.includes('/api/bookings')) return bookingResponse()
  return emptyResponse()
}

// ─── SHARED TEST HELPERS ──────────────────────────────────────────────────────

/** Navigates through the date/time step and clicks Continue. */
async function pickDateAndTime() {
  await screen.findByText(/Book a session/i)

  fireEvent.click(screen.getByRole('button', { name: /next month/i }))

  const dayButtons = screen
    .getAllByRole('button')
    .filter(
      (btn) =>
        /^\d+$/.test(btn.textContent?.trim() ?? '') &&
        !btn.hasAttribute('disabled'),
    )
  expect(dayButtons.length).toBeGreaterThan(0)

  // act() flushes the fetch + the setState(slots) that follows it
  await act(async () => {
    fireEvent.click(dayButtons[0])
  })

  // Slots are now in the DOM — no waitFor needed
  fireEvent.click(await screen.findByText('10:00'))

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  })
}

/** Fills Step 4 (details) and submits. */
async function fillDetailsAndConfirm({
  dog,
  email,
  phone,
}: {
  dog: string
  email: string
  phone: string
}) {
  await screen.findByPlaceholderText(/curi/i)
  fireEvent.change(screen.getByPlaceholderText(/curi/i), { target: { value: dog } })
  fireEvent.change(screen.getByPlaceholderText(/your@email/i), { target: { value: email } })
  fireEvent.change(screen.getByPlaceholderText(/\(123\)/i), { target: { value: phone } })

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
  })
}

// ─── LIFECYCLE ────────────────────────────────────────────────────────────────

global.fetch = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  ;(global.fetch as jest.Mock).mockImplementation(defaultFetchMock)
})

afterEach(async () => {
  // Flush any remaining React scheduler work so the MessagePort is idle
  // before Jest counts open handles.
  await act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
  })
  cleanup()
})

afterAll(() => {
  jest.restoreAllMocks()
})

// ─── TESTS ────────────────────────────────────────────────────────────────────

describe('BookPage - full booking flow (Nail Trim, guest)', () => {
  it('completes the booking and shows a confirmation', async () => {
    await act(async () => { render(<BookPage />) })

    // Step 1: select service
    fireEvent.click(await screen.findByText('Nail Trim'))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    })

    // Step 2: date + time (needs_style: false → step 3 is skipped)
    await pickDateAndTime()

    // Step 4: details
    await screen.findByRole('button', { name: /confirm booking/i })
    await fillDetailsAndConfirm({ dog: 'curi', email: 'test@example.com', phone: '403-555-0100' })

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/bookings',
        expect.objectContaining({ method: 'POST' }),
      ),
    )

    await screen.findByText(/we've received your booking/i)
    expect(screen.getByText('curi')).toBeInTheDocument()
  })
})

describe('BookPage - account creation flow (guest → create account)', () => {
  it('shows the account creation form with email pre-filled after booking', async () => {
    await act(async () => { render(<BookPage />) })

    // Step 1
    fireEvent.click(await screen.findByText('Nail Trim'))
    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    })

    // Step 2
    await pickDateAndTime()

    // Step 4
    await fillDetailsAndConfirm({ dog: 'Mochi', email: 'mochi@example.com', phone: '403-555-0101' })

    await screen.findByText(/we've received your booking/i)

    // Trigger account creation
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await screen.findByRole('heading', { name: /create your account/i })
    expect(screen.getByDisplayValue('mochi@example.com')).toBeInTheDocument()
  })
})

describe('BookPage - logged-in user with a saved dog', () => {
  beforeEach(() => {
    const { supabase } = require('@/utils/supabase/client')

    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'saved@example.com', phone: '403-111-2222' } },
    })
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-123', email: 'saved@example.com' } } },
    })
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: [{ name: 'Mochi', breed: 'Poodle' }] }),
    })
  })

  it('pre-fills email/phone and does not call /api/dogs when the dog already exists', async () => {
    await act(async () => { render(<BookPage />) })

    // Step 1
    fireEvent.click(await screen.findByText('Nail Trim'))
    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    })

    // Step 2
    await pickDateAndTime()

    // Step 4: verify pre-fill before submitting
    await screen.findByPlaceholderText(/curi/i)
    expect(screen.getByPlaceholderText(/your@email/i)).toHaveValue('saved@example.com')
    expect(screen.getByPlaceholderText(/\(123\)/i)).toHaveValue('403-111-2222')

    await fillDetailsAndConfirm({ dog: 'Mochi', email: 'saved@example.com', phone: '403-111-2222' })

    await screen.findByText(/we've received your booking/i)

    // Logged-in users should not see the "Create Account" prompt
    expect(screen.queryByRole('button', { name: /create account/i })).not.toBeInTheDocument()

    // Dog already exists → no /api/dogs call
    const dogCalls = (global.fetch as jest.Mock).mock.calls.filter(([url]: [string]) =>
      url.includes('/api/dogs'),
    )
    expect(dogCalls).toHaveLength(0)
  })
})

describe('BookPage - Full Spa Package with style selection', () => {
  beforeEach(() => {
    // The top-level mock uses a factory function, so we need mockReturnValue here
    const { useServices } = require('@/lib/hooks/useServices')
    ;(useServices as jest.Mock)?.mockReturnValue?.({
      services: [
        {
          id: 2,
          name: 'Full Spa Package',
          price: 120,
          slots: 3,
          needs_style: true,
          icon: 'ti-sparkles',
          duration: 90,
        },
      ],
      loading: false,
      error: null,
    })
  })

  it('completes the booking including the style-selection step', async () => {
    await act(async () => { render(<BookPage />) })

    // Step 1
    fireEvent.click(await screen.findByText('Full Spa Package'))

    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    })

    // Step 2: verify slots param is forwarded
    pickDateAndTime();

    // Step 3: style selection (needs_style: true)
    fireEvent.click(await screen.findByText('Cute Cut'))

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    })

    // Step 4
    await fillDetailsAndConfirm({ dog: 'Bella', email: 'bella@example.com', phone: '403-555-9999' })

    await screen.findByText(/we've received your booking/i)
    expect(screen.getByText('Bella')).toBeInTheDocument()

    // Confirm style_id was included in the POST body
    const bookingCall = (global.fetch as jest.Mock).mock.calls.find(([url]: [string]) =>
      url.includes('/api/bookings'),
    )
    expect(JSON.parse(bookingCall[1].body)).toMatchObject({ style_id: 1 })
  })
})