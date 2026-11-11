import {
  API_ERROR_CODES,
  ASSISTANT_ENDPOINT,
  LIMITS,
  type ApiErrorCode,
  type AssistantRequest,
  type ReplyRequest,
  type ReplyResponse,
  type ScheduledRequest,
} from '../../shared/assistant';
import { isRecord } from '../../shared/guards';
import { templateMessage } from '../domain/automatedMessages';
import { demoReply } from './demoAssistant';

export type AssistantMode = 'live' | 'demo';

export interface ScheduledText {
  text: string;
  /** 'template' when fixed wording was used because no model answered. */
  origin: 'assistant' | 'template';
}

export interface AssistantClient {
  /** Finds out once whether a model is configured on the server. */
  resolveMode: () => Promise<AssistantMode>;
  reply: (request: Omit<ReplyRequest, 'task'>) => Promise<ReplyResponse>;
  scheduledMessage: (request: Omit<ScheduledRequest, 'task'>) => Promise<ScheduledText>;
}

export type AssistantFailure = ApiErrorCode | 'network' | 'bad_response';

const FAILURE_MESSAGE: Readonly<Partial<Record<AssistantFailure, string>>> = {
  rate_limited: 'The assistant is handling too many requests. Try again in a minute.',
  upstream_timeout: 'The model took too long to answer.',
  upstream_error: 'The model could not answer this message.',
  not_configured: 'No model is configured on the server.',
  network: 'Could not reach the assistant. Check your connection.',
};

/** An assistant call that failed, with wording that is safe to show an operator. */
export class AssistantError extends Error {
  readonly failure: AssistantFailure;

  constructor(failure: AssistantFailure) {
    super(FAILURE_MESSAGE[failure] ?? 'The assistant could not process this message.');
    this.name = 'AssistantError';
    this.failure = failure;
  }
}

const STATUS_TIMEOUT_MS = 4_000;
/** Longer than the server's own deadline, so the server's answer (or its 504) arrives first. */
const REQUEST_TIMEOUT_MS = 35_000;
/** Long enough to see a message move through "Processing" when the demo responder answers instantly. */
const DEMO_REPLY_DELAY_MS = 600;

function isReplyResponse(value: unknown): value is ReplyResponse {
  if (!isRecord(value) || typeof value.usedSearch !== 'boolean' || !isRecord(value.result)) {
    return false;
  }
  const { result } = value;
  switch (result.kind) {
    case 'reply':
      return typeof result.text === 'string' && Array.isArray(result.sources);
    case 'maintenance':
      return typeof result.task === 'string';
    case 'escalation':
      return typeof result.reason === 'string';
    default:
      return false;
  }
}

function errorCodeOf(body: unknown): ApiErrorCode | null {
  const code = isRecord(body) && isRecord(body.error) ? body.error.code : null;
  return API_ERROR_CODES.find((known) => known === code) ?? null;
}

export interface AssistantClientOptions {
  fetch?: typeof globalThis.fetch;
  demoReplyDelayMs?: number;
}

export function createAssistantClient({
  fetch: request = globalThis.fetch.bind(globalThis),
  demoReplyDelayMs = DEMO_REPLY_DELAY_MS,
}: AssistantClientOptions = {}): AssistantClient {
  let mode: Promise<AssistantMode> | null = null;

  async function detectMode(): Promise<AssistantMode> {
    try {
      const response = await request(ASSISTANT_ENDPOINT, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(STATUS_TIMEOUT_MS),
      });
      if (!response.ok) return 'demo';
      const body: unknown = await response.json();
      return isRecord(body) && body.mode === 'live' ? 'live' : 'demo';
    } catch {
      // No route at all (static hosting) or an unreachable server: the demo responder takes over.
      return 'demo';
    }
  }

  async function post(body: AssistantRequest): Promise<unknown> {
    let response: Response;
    try {
      response = await request(ASSISTANT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      // Checked by name: a DOMException is not always an `Error` instance across realms.
      const timedOut = isRecord(error) && error.name === 'TimeoutError';
      throw new AssistantError(timedOut ? 'upstream_timeout' : 'network');
    }

    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new AssistantError(errorCodeOf(payload) ?? 'bad_response');
    return payload;
  }

  const resolveMode = () => {
    mode ??= detectMode();
    return mode;
  };

  return {
    resolveMode,

    async reply(input) {
      if ((await resolveMode()) === 'demo') {
        await new Promise((resolve) => setTimeout(resolve, demoReplyDelayMs));
        return demoReply(input);
      }

      const payload = await post({
        task: 'reply',
        ...input,
        message: input.message.slice(0, LIMITS.guestMessage),
      });
      if (!isReplyResponse(payload)) throw new AssistantError('bad_response');
      return payload;
    },

    async scheduledMessage(input) {
      const template: ScheduledText = {
        text: templateMessage(input.kind, input.guestName, input.propertyName),
        origin: 'template',
      };
      if ((await resolveMode()) === 'demo') return template;

      try {
        const payload = await post({ task: 'scheduled', ...input });
        if (isRecord(payload) && typeof payload.text === 'string' && payload.text.trim()) {
          return { text: payload.text.trim(), origin: 'assistant' };
        }
        return template;
      } catch {
        // A reminder about check-in time must still go out when the model is down.
        // The activity log marks the message as sent from the template.
        return template;
      }
    },
  };
}
