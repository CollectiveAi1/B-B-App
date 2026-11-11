import { LIMITS, type AssistantResult, type Source } from './assistant.js';

/**
 * The model answers in plain text and signals an action by starting its reply
 * with one of two markers. Plain text keeps Google Search grounding available,
 * which the Gemini API does not combine with JSON output.
 */
export const TASK_MARKER = 'ESCALATE_TASK:';
export const ESCALATION_MARKER = 'ESCALATE:';

// Models sometimes wrap the marker in markdown or add a leading blank line, so
// tolerate that noise instead of showing the guest a raw "ESCALATE:" string.
const LEADING_NOISE = String.raw`^[\s*_\`>#-]*`;
const TASK_PATTERN = new RegExp(`${LEADING_NOISE}ESCALATE[_\\s-]?TASK\\s*:`, 'i');
const ESCALATION_PATTERN = new RegExp(`${LEADING_NOISE}ESCALATE\\s*:`, 'i');

const FALLBACK_TASK = 'Inspect the issue the guest reported.';
const FALLBACK_REASON = 'The assistant flagged this message for a person to review.';

/** One clean line for a task or a reason: no markdown emphasis, no line breaks. */
function tidy(text: string): string {
  return text.replace(/[*`]/g, '').replace(/\s+/g, ' ').trim().slice(0, LIMITS.replyText);
}

/** Turns raw model output into the action the dashboard should take. */
export function parseAssistantText(raw: string, sources: Source[] = []): AssistantResult {
  const taskMatch = TASK_PATTERN.exec(raw);
  if (taskMatch) {
    return { kind: 'maintenance', task: tidy(raw.slice(taskMatch[0].length)) || FALLBACK_TASK };
  }

  const escalationMatch = ESCALATION_PATTERN.exec(raw);
  if (escalationMatch) {
    return {
      kind: 'escalation',
      reason: tidy(raw.slice(escalationMatch[0].length)) || FALLBACK_REASON,
    };
  }

  const text = raw.trim().slice(0, LIMITS.replyText);
  if (!text) {
    return { kind: 'escalation', reason: 'The assistant returned an empty reply.' };
  }
  return { kind: 'reply', text, sources };
}

/**
 * Keeps only web links that are safe to render as an anchor. Grounding URLs come
 * back from the model, so anything that is not plain http(s) is dropped rather
 * than trusted.
 */
export function sanitizeSources(candidates: readonly Partial<Source>[]): Source[] {
  const seen = new Set<string>();
  const sources: Source[] = [];

  for (const candidate of candidates) {
    if (sources.length >= LIMITS.sources) break;
    const url = toHttpUrl(candidate.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    sources.push({ title: candidate.title?.trim().slice(0, 120) || hostnameOf(url), url });
  }
  return sources;
}

function toHttpUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

function hostnameOf(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '');
}
