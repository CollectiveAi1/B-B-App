import {
  AUTOMATED_MESSAGE_KINDS,
  LIMITS,
  type AssistantRequest,
  type AutomatedMessageKind,
  type StayContext,
} from '../shared/assistant.js';
import { isRecord } from '../shared/guards.js';

export type Validated<Value> = { ok: true; value: Value } | { ok: false; message: string };

const invalid = (message: string): { ok: false; message: string } => ({ ok: false, message });

// Control characters have no place in a name or a chat message, and stripping
// them keeps log lines and prompts single-purpose. Tabs and newlines survive in
// message bodies only.
// oxlint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A short single-line label such as a guest or property name. */
function readLabel(value: unknown, field: string, maxLength: number): Validated<string> {
  if (typeof value !== 'string') return invalid(`${field} must be a string.`);
  const label = value.replace(CONTROL_CHARS, '').replace(/\s+/g, ' ').trim();
  if (!label) return invalid(`${field} is required.`);
  if (label.length > maxLength)
    return invalid(`${field} must be ${maxLength} characters or fewer.`);
  return { ok: true, value: label };
}

function readMessage(value: unknown): Validated<string> {
  if (typeof value !== 'string') return invalid('message must be a string.');
  const message = value.replace(CONTROL_CHARS, '').trim();
  if (!message) return invalid('message is required.');
  if (message.length > LIMITS.guestMessage) {
    return invalid(`message must be ${LIMITS.guestMessage} characters or fewer.`);
  }
  return { ok: true, value: message };
}

function readDate(value: unknown, field: string): Validated<string> {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) {
    return invalid(`${field} must be a date in YYYY-MM-DD form.`);
  }
  // Date.parse accepts 2026-02-31 and rolls it over, so compare the round trip.
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return invalid(`${field} is not a real calendar date.`);
  }
  return { ok: true, value };
}

function readStay(value: unknown): Validated<StayContext | null> {
  if (value === null || value === undefined) return { ok: true, value: null };
  if (!isRecord(value)) return invalid('stay must be an object or null.');

  const propertyName = readLabel(value.propertyName, 'stay.propertyName', LIMITS.propertyName);
  if (!propertyName.ok) return propertyName;
  const checkIn = readDate(value.checkIn, 'stay.checkIn');
  if (!checkIn.ok) return checkIn;
  const checkOut = readDate(value.checkOut, 'stay.checkOut');
  if (!checkOut.ok) return checkOut;
  if (checkOut.value < checkIn.value) return invalid('stay.checkOut must not be before checkIn.');

  return {
    ok: true,
    value: { propertyName: propertyName.value, checkIn: checkIn.value, checkOut: checkOut.value },
  };
}

function isAutomatedMessageKind(value: unknown): value is AutomatedMessageKind {
  return AUTOMATED_MESSAGE_KINDS.some((kind) => kind === value);
}

/**
 * Checks an untrusted request body and returns a clean copy. Nothing reaches
 * the prompt builder without passing through here.
 */
export function parseAssistantRequest(body: unknown): Validated<AssistantRequest> {
  if (!isRecord(body)) return invalid('Request body must be a JSON object.');

  const guestName = readLabel(body.guestName, 'guestName', LIMITS.guestName);
  if (!guestName.ok) return guestName;

  if (body.task === 'reply') {
    const message = readMessage(body.message);
    if (!message.ok) return message;
    const stay = readStay(body.stay);
    if (!stay.ok) return stay;
    return {
      ok: true,
      value: {
        task: 'reply',
        guestName: guestName.value,
        message: message.value,
        stay: stay.value,
      },
    };
  }

  if (body.task === 'scheduled') {
    if (!isAutomatedMessageKind(body.kind)) {
      return invalid(`kind must be one of: ${AUTOMATED_MESSAGE_KINDS.join(', ')}.`);
    }
    const propertyName = readLabel(body.propertyName, 'propertyName', LIMITS.propertyName);
    if (!propertyName.ok) return propertyName;
    return {
      ok: true,
      value: {
        task: 'scheduled',
        kind: body.kind,
        guestName: guestName.value,
        propertyName: propertyName.value,
      },
    };
  }

  return invalid('task must be "reply" or "scheduled".');
}
