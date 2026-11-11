import { describe, expect, it } from 'vitest';
import { createRateLimiter } from './rateLimit.js';

describe('createRateLimiter', () => {
  it('allows requests up to the limit, then refuses with a retry hint', () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 });
    expect(limiter.take('a', 0).allowed).toBe(true);
    expect(limiter.take('a', 1_000).allowed).toBe(true);
    expect(limiter.take('a', 15_000)).toEqual({ allowed: false, retryAfterSeconds: 45 });
  });

  it('starts a fresh window once the old one ends', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    limiter.take('a', 0);
    expect(limiter.take('a', 59_999).allowed).toBe(false);
    expect(limiter.take('a', 60_000).allowed).toBe(true);
  });

  it('counts each client separately', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    limiter.take('a', 0);
    expect(limiter.take('b', 0).allowed).toBe(true);
  });

  it('keeps accepting new clients when the key table is full', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, maxKeys: 3 });
    for (const key of ['a', 'b', 'c']) limiter.take(key, 0);
    expect(limiter.take('d', 1).allowed).toBe(true);
    expect(limiter.take('e', 2).allowed).toBe(true);
  });
});
