import { describe, expect, it, vi } from 'vitest';
import { ASSISTANT_ENDPOINT } from '../../shared/assistant';
import { CANNED_REPLY } from '../../shared/cannedReplies';
import { AssistantError, createAssistantClient } from './assistantClient';

type FetchMock = ReturnType<typeof vi.fn<typeof fetch>>;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** A fetch whose GET answers the status call and whose POST answers the task. */
function fakeFetch(status: Response | Error, post?: Response | Error): FetchMock {
  return vi.fn<typeof fetch>((_url, init) => {
    const outcome = init?.method === 'POST' ? post : status;
    if (!outcome) return Promise.reject(new Error('unexpected request'));
    // Anything that is not a Response is a rejection, whatever realm the error came from.
    return outcome instanceof Response ? Promise.resolve(outcome.clone()) : Promise.reject(outcome);
  });
}

const question = { guestName: 'Alice', message: 'What time is check-in?', stay: null };
const reminder = { kind: 'preArrival', guestName: 'Alice', propertyName: 'The Penthouse' } as const;
const client = (fetch: FetchMock) => createAssistantClient({ fetch, demoReplyDelayMs: 0 });

describe('mode detection', () => {
  it('is live when the server reports a configured model', async () => {
    expect(await client(fakeFetch(json({ mode: 'live', model: 'm' }))).resolveMode()).toBe('live');
  });

  it.each([
    ['the server reports demo', json({ mode: 'demo', model: null })],
    ['there is no route (static hosting)', new Response('<!doctype html>', { status: 404 })],
    ['the route returns something unexpected', json({ hello: 'world' })],
    ['the network is down', new TypeError('Failed to fetch')],
  ])('is demo when %s', async (_label, status) => {
    expect(await client(fakeFetch(status)).resolveMode()).toBe('demo');
  });

  it('asks the server once', async () => {
    const fetch = fakeFetch(json({ mode: 'demo', model: null }));
    const assistant = client(fetch);
    await Promise.all([
      assistant.resolveMode(),
      assistant.resolveMode(),
      assistant.reply(question),
    ]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('demo mode', () => {
  const fetch = () => fakeFetch(json({ mode: 'demo', model: null }));

  it('answers locally without sending guest text anywhere', async () => {
    const request = fetch();
    const response = await client(request).reply(question);
    expect(response.result).toMatchObject({ kind: 'reply', text: CANNED_REPLY.checkIn });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('sends scheduled messages from the template', async () => {
    const message = await client(fetch()).scheduledMessage(reminder);
    expect(message.origin).toBe('template');
    expect(message.text).toContain('The Penthouse');
  });
});

describe('live mode', () => {
  const live = json({ mode: 'live', model: 'm' });

  it('posts the task to the server and returns its result', async () => {
    const result = {
      result: { kind: 'reply', text: 'After 3 PM.', sources: [] },
      usedSearch: false,
    };
    const fetch = fakeFetch(live, json(result));
    expect(await client(fetch).reply(question)).toEqual(result);

    const [url, init] = fetch.mock.calls[1] ?? [];
    expect(url).toBe(ASSISTANT_ENDPOINT);
    expect(JSON.parse(String(init?.body))).toEqual({ task: 'reply', ...question });
  });

  it.each([
    ['rate_limited', 429, 'too many requests'],
    ['upstream_timeout', 504, 'too long'],
    ['upstream_error', 502, 'could not answer'],
  ])('turns a %s response into an error an operator can read', async (code, status, wording) => {
    const fetch = fakeFetch(live, json({ error: { code, message: 'server detail' } }, status));
    const failure = await client(fetch)
      .reply(question)
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(AssistantError);
    expect((failure as AssistantError).failure).toBe(code);
    expect((failure as AssistantError).message).toContain(wording);
    expect((failure as AssistantError).message).not.toContain('server detail');
  });

  it('reports a network failure', async () => {
    const fetch = fakeFetch(live, new TypeError('Failed to fetch'));
    await expect(client(fetch).reply(question)).rejects.toMatchObject({ failure: 'network' });
  });

  it('reports its own timeout as a slow model, not a broken connection', async () => {
    const fetch = fakeFetch(live, new DOMException('The operation timed out.', 'TimeoutError'));
    await expect(client(fetch).reply(question)).rejects.toMatchObject({
      failure: 'upstream_timeout',
      message: 'The model took too long to answer.',
    });
  });

  it('does not fall back to a scripted answer when the model fails', async () => {
    const fetch = fakeFetch(live, json({ error: { code: 'upstream_error', message: 'x' } }, 502));
    await expect(client(fetch).reply(question)).rejects.toBeInstanceOf(AssistantError);
  });

  it.each([
    ['an unknown error code', json({ error: { code: 'teapot' } }, 418)],
    [
      'a response that is not the expected shape',
      json({ result: { kind: 'poem' }, usedSearch: false }),
    ],
    ['a non-JSON response', new Response('<html>', { status: 200 })],
  ])('rejects %s', async (_label, response) => {
    await expect(client(fakeFetch(live, response)).reply(question)).rejects.toMatchObject({
      failure: 'bad_response',
    });
  });

  it('uses the model for scheduled messages', async () => {
    const fetch = fakeFetch(live, json({ text: ' See you tomorrow, Alice! ' }));
    expect(await client(fetch).scheduledMessage(reminder)).toEqual({
      text: 'See you tomorrow, Alice!',
      origin: 'assistant',
    });
  });

  it('still sends a scheduled message from the template when the model is down', async () => {
    const fetch = fakeFetch(live, json({ error: { code: 'upstream_error', message: 'x' } }, 502));
    const message = await client(fetch).scheduledMessage(reminder);
    expect(message.origin).toBe('template');
    expect(message.text).toContain('check-in is anytime after 3 PM');
  });
});
