# Pawco — Dog Grooming App (Client)

Mobile-first Next.js 14 + TypeScript prototype matching the approved design.

## Stack

- **Next.js 14** — App Router
- **TypeScript** — strict mode
- **Tailwind CSS** — custom brand tokens
- **Tabler Icons** — via CDN webfont
- **Nunito / Nunito Sans** — via next/font/google

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project structure

```
src/
  app/
    page.tsx          ← Splash screen (/)
    layout.tsx        ← Root layout, fonts, global CSS
    globals.css       ← Brand tokens + Tailwind base
    home/
      page.tsx        ← Home screen (/home)
      SizeSelector.tsx
      BreedSelector.tsx
    book/
      page.tsx        ← 3-step booking flow (/book)
    login/
      page.tsx        ← Sign in / sign up (/login)
    account/
      page.tsx        ← Account menu (/account)
  components/
    ui/
      Button.tsx      ← Shared button component
    layout/
      TopBar.tsx      ← Top navigation bar
      BottomNav.tsx   ← Bottom tab navigation
  lib/
    data.ts           ← Static fake data (swap for API calls)
    utils.ts          ← cn() class merge helper
  types/
    index.ts          ← Shared TypeScript types
```

## Swapping fake data for real API

All fake data lives in `src/lib/data.ts`. When the backend is ready:

1. Replace imports from `@/lib/data` with `fetch()` calls or React Query hooks
2. The `BookingDraft` type in `src/types/index.ts` maps directly to your POST /bookings body
3. The `handleContinue` function in `src/app/book/page.tsx` is where you wire up the API call

## Next steps

- [ ] Admin dashboard (separate Next.js app or `/admin` route group)
- [ ] Connect auth (NextAuth.js or Clerk)
- [ ] Connect booking API (POST /bookings)
- [ ] Fetch real availability from API in DateTimeStep
- [ ] Add pet profile management to account screen
