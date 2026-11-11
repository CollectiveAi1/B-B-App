import {
  LIMITS,
  type ApiErrorBody,
  type ApiErrorCode,
  type AssistantRequest,
  type ReplyResponse,
  type ScheduledResponse,
  type StatusResponse,
} from '../shared/assistant.js';
import { parseAssistantText, sanitizeSources } from '../shared/protocol.js';
import { classifyTopic } from '../shared/topics.js';
import { RATE_LIMITS, readConfig, type Env } from './config.js';
import { createGeminiCaller, UpstreamError, type ModelCaller } from './gemini.js';
import {
  buildReplyInstruction,
  buildReplyPrompt,
  buildScheduledPrompt,
  SCHEDULED_INSTRUCTION,
} from './prompts.js';
import { createRateLimiter } from './rateLimit.js';
import { parseAssistantRequest } from './validation.js';

export interface RequestContext {
  /** Stable identifier for the caller, normally the client IP as reported by the platform. */
  clientId: string;
}

export type AssistantHandler = (request: Request, context: RequestContext) => Promise<Response>;

export interface Logger {
  info: (entry: Record<string, unknown>) => void;
  error: (entry: Record<string, unknown>) => void;
}

/** One JSON object per line, so the host platform's log search can filter on fields. */
const jsonLogger: Logger = {
  info: (entry) => console.info(JSON.stringify({ level: 'info', ...entry })),
  error: (entry) => console.error(JSON.stringify({ level: 'error', ...entry })),
};

export interface HandlerOptions {
  env: Env;
  /** Swapped out in tests so no request leaves the machine. */
  createModelCaller?: (apiKey: string, model: string) => ModelCaller;
  logger?: Logger;
  now?: () => number;
}

const BASE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...BASE_HEADERS, ...headers } });
}

/** Thrown inside the handler to end a request with a specific HTTP error. */
class HttpError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly headers: Record<string, string>;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    headers: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.headers = headers;
  }
}

/**
 * Hosts this request may claim to come from: the host in its URL, plus the
 * public host a reverse proxy reports when it forwards to an internal address.
 *
 * Trusting X-Forwarded-Host is safe for this check. The threat is another
 * website posting through a visitor's browser, and a page cannot set that
 * header on a cross-site request without a CORS preflight, which this route
 * never approves.
 */
function ownHosts(request: Request): Set<string> {
  const forwarded = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  return new Set([new URL(request.url).host, ...(forwarded ? [forwarded] : [])]);
}

/**
 * Browsers attach Origin to every cross-site POST. Rejecting a missing or
 * foreign origin stops another website from spending this deployment's model
 * quota through a visitor's browser. It is not authentication: a script can
 * forge the header, which is what the rate limits are for.
 */
function assertSameOrigin(request: Request): void {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin') {
    throw new HttpError(403, 'forbidden_origin', 'Cross-site requests are not allowed.');
  }

  const origin = request.headers.get('origin');
  let originHost: string | null = null;
  try {
    originHost = origin ? new URL(origin).host : null;
  } catch {
    originHost = null;
  }
  if (!originHost || !ownHosts(request).has(originHost)) {
    throw new HttpError(403, 'forbidden_origin', 'Requests must come from this site.');
  }
}

/** Reads the body as text and stops as soon as it exceeds the size cap. */
async function readBody(request: Request): Promise<string> {
  const tooLarge = new HttpError(
    413,
    'payload_too_large',
    `Request body must be ${LIMITS.requestBytes} bytes or fewer.`,
  );
  if (Number(request.headers.get('content-length') ?? 0) > LIMITS.requestBytes) throw tooLarge;
  if (!request.body) return '';

  const decoder = new TextDecoder();
  let received = 0;
  let text = '';

  // Throwing out of the loop cancels the stream, so an oversized body is never read in full.
  for await (const chunk of request.body) {
    received += chunk.byteLength;
    if (received > LIMITS.requestBytes) throw tooLarge;
    text += decoder.decode(chunk, { stream: true });
  }
  return text + decoder.decode();
}

async function readAssistantRequest(request: Request): Promise<AssistantRequest> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'unsupported_media_type', 'Send the request as application/json.');
  }

  let body: unknown;
  try {
    body = JSON.parse(await readBody(request));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'invalid_request', 'Request body is not valid JSON.');
  }

  const parsed = parseAssistantRequest(body);
  if (!parsed.ok) throw new HttpError(400, 'invalid_request', parsed.message);
  return parsed.value;
}

async function runTask(
  task: AssistantRequest,
  model: ModelCaller,
): Promise<ReplyResponse | ScheduledResponse> {
  if (task.task === 'scheduled') {
    const { text } = await model({
      systemInstruction: SCHEDULED_INSTRUCTION,
      prompt: buildScheduledPrompt(task),
      useSearch: false,
    });
    const message = text.trim().slice(0, LIMITS.replyText);
    if (!message) {
      throw new UpstreamError('Gemini returned an empty scheduled message', {
        timedOut: false,
        status: null,
        cause: null,
      });
    }
    return { text: message };
  }

  // Search costs more and takes longer, so it is switched on only for questions that need it.
  const usedSearch = classifyTopic(task.message) === 'local_recommendations';
  const { text, sources } = await model({
    systemInstruction: buildReplyInstruction({ searchEnabled: usedSearch }),
    prompt: buildReplyPrompt(task),
    useSearch: usedSearch,
  });
  return { result: parseAssistantText(text, sanitizeSources(sources)), usedSearch };
}

/**
 * Maps anything thrown while handling a request to the HTTP error the caller
 * sees, plus detail for the server log only. The provider's own message never
 * goes into the response.
 */
function toHttpError(error: unknown): { error: HttpError; logDetail: Record<string, unknown> } {
  if (error instanceof HttpError) return { error, logDetail: {} };

  if (error instanceof UpstreamError) {
    return {
      error: error.timedOut
        ? new HttpError(504, 'upstream_timeout', 'The model took too long to answer.')
        : new HttpError(502, 'upstream_error', 'The model could not answer this request.'),
      logDetail: { upstreamStatus: error.status, reason: error.message },
    };
  }

  return {
    error: new HttpError(500, 'internal_error', 'Something went wrong on the server.'),
    logDetail: { reason: error instanceof Error ? error.message : String(error) },
  };
}

/**
 * Builds the handler for /api/assistant.
 *
 * GET reports whether a model is configured. POST runs one assistant task. The
 * handler speaks the Fetch API (Request in, Response out), so the same function
 * serves the Vite dev server and a Vercel Function.
 */
export function createAssistantHandler({
  env,
  createModelCaller = createGeminiCaller,
  logger = jsonLogger,
  now = Date.now,
}: HandlerOptions): AssistantHandler {
  const config = readConfig(env);
  const callModel = config.apiKey ? createModelCaller(config.apiKey, config.model) : null;
  const perClient = createRateLimiter(RATE_LIMITS.perClient);
  const global = createRateLimiter(RATE_LIMITS.global);

  const status: StatusResponse = callModel
    ? { mode: 'live', model: config.model }
    : { mode: 'demo', model: null };

  function assertWithinRateLimit(clientId: string): void {
    // Order matters. A request refused for its own client must not count
    // against the shared budget, or one noisy client could lock out everyone.
    let decision = perClient.take(clientId, now());
    if (decision.allowed) decision = global.take('all', now());
    if (!decision.allowed) {
      throw new HttpError(429, 'rate_limited', 'Too many requests. Try again shortly.', {
        'Retry-After': String(decision.retryAfterSeconds),
      });
    }
  }

  async function handlePost(request: Request, context: RequestContext): Promise<Response> {
    assertSameOrigin(request);
    assertWithinRateLimit(context.clientId);
    if (!callModel) {
      throw new HttpError(503, 'not_configured', 'No model API key is configured on the server.');
    }
    const task = await readAssistantRequest(request);
    return json(await runTask(task, callModel), 200);
  }

  return async function handle(request, context) {
    if (request.method === 'GET' || request.method === 'HEAD') {
      return json(status, 200);
    }

    const requestId = crypto.randomUUID();
    const startedAt = now();
    const finish = (response: Response, detail: Record<string, unknown> = {}) => {
      response.headers.set('X-Request-Id', requestId);
      // Deliberately no guest text, names, or client address in the log line.
      const entry = {
        event: 'assistant_request',
        requestId,
        method: request.method,
        status: response.status,
        durationMs: now() - startedAt,
        ...detail,
      };
      if (response.status >= 500) logger.error(entry);
      else logger.info(entry);
      return response;
    };
    const fail = (thrown: unknown) => {
      const { error, logDetail } = toHttpError(thrown);
      const body: ApiErrorBody = { error: { code: error.code, message: error.message } };
      return finish(json(body, error.status, error.headers), { code: error.code, ...logDetail });
    };

    if (request.method !== 'POST') {
      return fail(
        new HttpError(405, 'method_not_allowed', 'Use GET or POST.', { Allow: 'GET, HEAD, POST' }),
      );
    }

    try {
      return finish(await handlePost(request, context));
    } catch (error) {
      return fail(error);
    }
  };
}
