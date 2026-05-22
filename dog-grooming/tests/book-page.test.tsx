import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import BookPage from '@/app/book/page'

// ─── MOCK HOOKS ─────────────────────────────────────────────
jest.mock('@/lib/hooks/useServices', () => ({
  useServices: () => ({
    services: [
      {
        id: 1,
        name: 'Basic Groom',
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
    styles: [
      {
        id: 1,
        name: 'Cute Cut',
        emoji: '🐶',
        desc: 'Nice style',
      },
    ],
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
      getSession: jest.fn().mockResolvedValue({
        data: { session: null },
      }),
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
      }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: [] }),
    })),
  },
}))

global.fetch = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
    if (url.includes('/api/availability')) {
      return Promise.resolve({
        json: () =>
          Promise.resolve({
            slots: [
              { time: '10:00', available: true },
              { time: '11:00', available: true },
            ],
          }),
      })
    }
    if (url.includes('/api/bookings')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ booking: { id: 123 } }),
      })
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    })
  })
})

// ─── TEST ─────────────────────────────────────────────
describe('BookPage - full booking flow', () => {
  it('completes full booking flow successfully', async () => {
    render(<BookPage />)

    // STEP 1: select service
    const service = await screen.findByText('Basic Groom')
    fireEvent.click(service)

    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    // STEP 2: date step — find a future enabled day button
    await screen.findByText(/pick a date/i)

    // Click the "Next month" arrow to go to June, where all days are in the future
    fireEvent.click(screen.getByRole('button', { name: /next month/i }))

    // Now all day buttons are enabled — grab the first one
    const dayButtons = screen
      .getAllByRole('button')
      .filter(
        (btn) =>
          /^\d+$/.test(btn.textContent?.trim() ?? '') &&
          !btn.hasAttribute('disabled'),
      )

    expect(dayButtons.length).toBeGreaterThan(0)
    fireEvent.click(dayButtons[0])

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/availability'),
      )
    })

        await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/availability'),
    )
    })

    const timeSlot = await screen.findByText('10:00')
    fireEvent.click(timeSlot)

    // Re-query continue button — previous reference is stale after re-render
    await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    })

    // STEP 3 is skipped (needs_style: false) → goes straight to step 4
    await screen.findByPlaceholderText(/curi/i)

    const dogInput = screen.getByPlaceholderText(/curi/i)
    fireEvent.change(dogInput, { target: { value: 'curi' } })

    const emailInput = screen.getByPlaceholderText(/your@email/i)
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

    const phoneInput = screen.getByPlaceholderText(/\(123\)/i)
    fireEvent.change(phoneInput, { target: { value: '403-555-0100' } })

    await act(async () => {
  fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
})


    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/bookings',
        expect.objectContaining({ method: 'POST' }),
      )
    })

    await screen.findByText(/booking confirmed/i)
    expect(screen.getByText('curi')).toBeInTheDocument()
  })
})
describe('BookPage - account creation flow', () => {
  it('completes booking and navigates to account creation', async () => {
    render(<BookPage />)

    const service = await screen.findByText('Basic Groom')
    fireEvent.click(service)
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await screen.findByText(/pick a date/i)
    fireEvent.click(screen.getByRole('button', { name: /next month/i }))
    const dayButtons = screen
      .getAllByRole('button')
      .filter((btn) => /^\d+$/.test(btn.textContent?.trim() ?? '') && !btn.hasAttribute('disabled'))
    fireEvent.click(dayButtons[0])
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/availability')))

    const timeSlot = await screen.findByText('10:00')
    fireEvent.click(timeSlot)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    })

    await screen.findByPlaceholderText(/curi/i)
    fireEvent.change(screen.getByPlaceholderText(/curi/i), { target: { value: 'Mochi' } })
    fireEvent.change(screen.getByPlaceholderText(/your@email/i), { target: { value: 'mochi@example.com' } })
    fireEvent.change(screen.getByPlaceholderText(/\(123\)/i), { target: { value: '403-555-0101' } })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    })

    await screen.findByText(/booking confirmed/i)

    // Click "Create Account"
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    // Should show the account creation form with email pre-filled
   await screen.findByRole('heading', { name: /create your account/i })
    expect(screen.getByDisplayValue('mochi@example.com')).toBeInTheDocument()
  })
})

describe('BookPage - logged in user with saved dog', () => {
  beforeEach(() => {
    const { supabase } = require('@/utils/supabase/client')
    supabase.auth.getUser.mockResolvedValue({
      data: {
        user: { id: 'user-123', email: 'saved@example.com', phone: '403-111-2222' },
      },
    })
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: { user: { id: 'user-123', email: 'saved@example.com' } },
      },
    })
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: [{ name: 'Mochi', breed: 'Poodle' }],
      }),
    })
  })

  it('pre-fills email and phone, and skips saving dog when already exists', async () => {
    await act(async () => { render(<BookPage />) })

    const service = await screen.findByText('Basic Groom')
    fireEvent.click(service)
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await screen.findByText(/pick a date/i)
    fireEvent.click(screen.getByRole('button', { name: /next month/i }))
    const dayButtons = screen
      .getAllByRole('button')
      .filter((btn) => /^\d+$/.test(btn.textContent?.trim() ?? '') && !btn.hasAttribute('disabled'))
    fireEvent.click(dayButtons[0])
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/availability')))

    const timeSlot = await screen.findByText('10:00')
    fireEvent.click(timeSlot)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    })

    await screen.findByPlaceholderText(/curi/i)

    // Email and phone should be pre-filled from the logged-in user
    expect(screen.getByPlaceholderText(/your@email/i)).toHaveValue('saved@example.com')
    expect(screen.getByPlaceholderText(/\(123\)/i)).toHaveValue('403-111-2222')

    // Type the same dog name that's already saved
    fireEvent.change(screen.getByPlaceholderText(/curi/i), { target: { value: 'Mochi' } })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    })

    await screen.findByText(/booking confirmed/i)

    // Should NOT see create account prompt (logged in)
    expect(screen.queryByRole('button', { name: /create account/i })).not.toBeInTheDocument()

    // Should NOT have called /api/dogs (dog already exists)
    const dogCalls = (global.fetch as jest.Mock).mock.calls.filter(([url]: [string]) =>
      url.includes('/api/dogs'),
    )
    expect(dogCalls).toHaveLength(0)
  })
})

describe('BookPage - Full Spa Package with style selection', () => {
  beforeEach(() => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/availability')) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              slots: [
                { time: '10:00', available: true },
                { time: '11:00', available: true },
              ],
            }),
        })
      }
      if (url.includes('/api/bookings')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ booking: { id: 999 } }),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })
  })

  it('completes full spa booking including style step', async () => {
    // Override useServices to return Full Spa
    jest.resetModules()
    const { useServices } = require('@/lib/hooks/useServices')
    ;(useServices as jest.Mock)?.mockReturnValue?.({
      services: [{
        id: 2,
        name: 'Full Spa Package',
        price: 120,
        slots: 3,
        needs_style: true,
        icon: 'ti-sparkles',
        duration: 90,
      }],
      loading: false,
      error: null,
    })

    render(<BookPage />)

    // STEP 1: select Full Spa
    const service = await screen.findByText('Full Spa Package')
    fireEvent.click(service)
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    // STEP 2: pick date and time
    await screen.findByText(/pick a date/i)
    fireEvent.click(screen.getByRole('button', { name: /next month/i }))
    const dayButtons = screen
      .getAllByRole('button')
      .filter((btn) => /^\d+$/.test(btn.textContent?.trim() ?? '') && !btn.hasAttribute('disabled'))
    fireEvent.click(dayButtons[0])
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('slots=3')))

    const timeSlot = await screen.findByText('10:00')
    fireEvent.click(timeSlot)

    // STEP 2 → 3 (style required for Full Spa)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    })

    // STEP 3: pick a style
    const style = await screen.findByText('Cute Cut')
    fireEvent.click(style)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    })

    // STEP 4: fill details
    await screen.findByPlaceholderText(/curi/i)
    fireEvent.change(screen.getByPlaceholderText(/curi/i), { target: { value: 'Bella' } })
    fireEvent.change(screen.getByPlaceholderText(/your@email/i), { target: { value: 'bella@example.com' } })
    fireEvent.change(screen.getByPlaceholderText(/\(123\)/i), { target: { value: '403-555-9999' } })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    })

    await screen.findByText(/booking confirmed/i)
    expect(screen.getByText('Bella')).toBeInTheDocument()

    // Verify style_id was sent in the booking payload
    const bookingCall = (global.fetch as jest.Mock).mock.calls.find(([url]: [string]) =>
      url.includes('/api/bookings'),
    )
    const payload = JSON.parse(bookingCall[1].body)
    expect(payload.style_id).toBe(1)
  })
})