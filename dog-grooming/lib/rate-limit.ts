import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

export const bookingLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 booking attempts per minute per IP
  analytics: true, // optional, lets you see stats in the Upstash dashboard
});

export const dogLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 dog creation attempts per minute per IP
  analytics: true, // optional, lets you see stats in the Upstash dashboard
});


export const browseLimiter = new Ratelimit({
  redis,
  prefix: "ratelimit:browse",
  limiter: Ratelimit.slidingWindow(30, "1 m"),
});