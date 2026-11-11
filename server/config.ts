/** Current stable Flash model. Override with GEMINI_MODEL when Google retires it. */
export const DEFAULT_MODEL = 'gemini-3.8-flash';

/**
 * Time budget for the model. The numbers nest so each layer fails before the
 * one above it: one attempt (15s) < all attempts (25s) < the function's
 * maxDuration in vercel.json (30s) < the browser's own timeout (35s). That way
 * a slow model always produces this route's 504, never a killed function.
 */
export const UPSTREAM_ATTEMPT_TIMEOUT_MS = 15_000;
export const UPSTREAM_DEADLINE_MS = 25_000;

/**
 * Request budgets per server instance. One operator's dashboard sends a handful
 * of calls per minute, so these leave plenty of headroom for real use while
 * capping what a script hammering the route can spend.
 */
export const RATE_LIMITS = {
  perClient: { limit: 30, windowMs: 60_000 },
  global: { limit: 120, windowMs: 60_000 },
} as const;

export type Env = Readonly<Record<string, string | undefined>>;

export interface AssistantConfig {
  /** Null when no key is set. The route then reports demo mode and refuses model calls. */
  apiKey: string | null;
  model: string;
}

export function readConfig(env: Env): AssistantConfig {
  return {
    apiKey: env.GEMINI_API_KEY?.trim() || null,
    model: env.GEMINI_MODEL?.trim() || DEFAULT_MODEL,
  };
}
