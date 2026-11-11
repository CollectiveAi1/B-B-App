/**
 * Wire contract between the dashboard and the assistant route.
 *
 * This file is imported by browser code and by the Node server, so it must stay
 * free of DOM and Node APIs.
 */

export const ASSISTANT_ENDPOINT = '/api/assistant';

export const AUTOMATED_MESSAGE_KINDS = ['preArrival', 'midStay', 'preDeparture'] as const;
export type AutomatedMessageKind = (typeof AUTOMATED_MESSAGE_KINDS)[number];

/** Upper bounds enforced on both sides of the wire. They cap prompt size and model spend. */
export const LIMITS = {
  guestMessage: 2000,
  guestName: 80,
  propertyName: 80,
  replyText: 4000,
  sources: 5,
  // A 2,000-character message can be 8 KB in a multi-byte script before JSON escaping.
  requestBytes: 16 * 1024,
} as const;

export interface Source {
  title: string;
  url: string;
}

/** What the assistant decided to do with a guest message. */
export type AssistantResult =
  | { kind: 'reply'; text: string; sources: Source[] }
  | { kind: 'maintenance'; task: string }
  | { kind: 'escalation'; reason: string };

/** Calendar dates (YYYY-MM-DD) in the host's time zone. */
export interface StayContext {
  propertyName: string;
  checkIn: string;
  checkOut: string;
}

export interface ReplyRequest {
  task: 'reply';
  guestName: string;
  message: string;
  stay: StayContext | null;
}

export interface ScheduledRequest {
  task: 'scheduled';
  kind: AutomatedMessageKind;
  guestName: string;
  propertyName: string;
}

export type AssistantRequest = ReplyRequest | ScheduledRequest;

export interface ReplyResponse {
  result: AssistantResult;
  usedSearch: boolean;
}

export interface ScheduledResponse {
  text: string;
}

export interface StatusResponse {
  mode: 'live' | 'demo';
  model: string | null;
}

export const API_ERROR_CODES = [
  'invalid_request',
  'method_not_allowed',
  'unsupported_media_type',
  'payload_too_large',
  'forbidden_origin',
  'rate_limited',
  'not_configured',
  'upstream_error',
  'upstream_timeout',
  'internal_error',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** Every non-2xx response from the assistant route has this shape. */
export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string };
}
