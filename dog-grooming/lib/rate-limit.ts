// In-memory sliding-window rate limiter (no external store).
//
// Counts are kept per server instance, so on serverless hosting (e.g. Vercel)
// each warm instance enforces its own window and counts reset on cold starts.
// That's best-effort protection against bursts and accidental double-submits,
// not a hard global limit.

type LimitResult = {
  success: boolean
  limit: number
  remaining: number
  reset: number // epoch ms when the oldest hit in the window expires
}

const MAX_TRACKED_KEYS = 10_000

function createLimiter(maxHits: number, windowMs: number) {
  const hits = new Map<string, number[]>()

  function prune(now: number) {
    for (const [key, times] of hits) {
      const fresh = times.filter((t) => now - t < windowMs)
      if (fresh.length) hits.set(key, fresh)
      else hits.delete(key)
    }
  }

  return {
    async limit(key: string): Promise<LimitResult> {
      const now = Date.now()
      if (hits.size > MAX_TRACKED_KEYS) prune(now)

      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
      const success = recent.length < maxHits
      if (success) recent.push(now)
      hits.set(key, recent)

      return {
        success,
        limit: maxHits,
        remaining: Math.max(0, maxHits - recent.length),
        reset: (recent[0] ?? now) + windowMs,
      }
    },
  }
}

const MINUTE = 60_000

export const bookingLimiter = createLimiter(5, MINUTE) // 5 booking attempts per minute per IP
export const dogLimiter = createLimiter(5, MINUTE)     // 5 dog creation attempts per minute per IP
export const browseLimiter = createLimiter(30, MINUTE) // 30 reads per minute per IP
