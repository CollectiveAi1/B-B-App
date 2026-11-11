export interface RateLimitDecision {
  allowed: boolean;
  /** Seconds until the current window ends. Zero when the request is allowed. */
  retryAfterSeconds: number;
}

export interface RateLimiter {
  take: (key: string, now?: number) => RateLimitDecision;
}

interface Window {
  startedAt: number;
  count: number;
}

export interface RateLimiterOptions {
  limit: number;
  windowMs: number;
  /** Upper bound on tracked keys, so a flood of spoofed client ids cannot grow memory forever. */
  maxKeys?: number;
}

/**
 * Fixed-window counter held in memory.
 *
 * Threat model: this stops one client, or a simple script, from running up the
 * model bill. Counters live in a single process, so on a platform that runs
 * several instances the effective limit is per instance. Put a shared store or
 * the platform's firewall in front when you need a hard guarantee.
 */
export function createRateLimiter({
  limit,
  windowMs,
  maxKeys = 10_000,
}: RateLimiterOptions): RateLimiter {
  const windows = new Map<string, Window>();

  const evictExpired = (now: number) => {
    for (const [key, window] of windows) {
      if (now - window.startedAt >= windowMs) windows.delete(key);
    }
    // Still full of live windows: drop them all rather than refuse every new client.
    if (windows.size >= maxKeys) windows.clear();
  };

  return {
    take(key, now = Date.now()) {
      const current = windows.get(key);

      if (!current || now - current.startedAt >= windowMs) {
        if (windows.size >= maxKeys) evictExpired(now);
        windows.set(key, { startedAt: now, count: 1 });
        return { allowed: true, retryAfterSeconds: 0 };
      }

      if (current.count >= limit) {
        const remainingMs = windowMs - (now - current.startedAt);
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(remainingMs / 1000)) };
      }

      current.count += 1;
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}
