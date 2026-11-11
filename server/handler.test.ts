import { describe, expect, it, vi } from 'vitest';
import { LIMITS, type ApiErrorBody } from '../shared/assistant.js';
import { DEFAULT_MODEL, RATE_LIMITS } from './config.js';
import { UpstreamError, type ModelCaller, type ModelResponse } from './gemini.js';
import { createAssistantHandler, type Logger } from './handler.js';

const ENDPOINT = 'https://stay.example/api/assistant';
const CONTEXT = { clientId: '203.0.113.7' };
const REPLY = { task: 'reply', guestName: 'Alice', message: 'Is there an iron?', stay: null };

function setup(
  options: {
    env?: Record<string, string>;
    respond?: ModelCaller;
  } = {},
) {
  const model = vi.fn<ModelCaller>(
    options.respond ?? (() => Promise.resolve({ text: 'Yes, in the closet.', sources: [] })),
  );
  const createModelCaller = vi.fn(() => model);
  const logger: Logger = { info: vi.fn(), error: vi.fn() };
  const handle = createAssistantHandler({
    env: options.env ?? { GEMINI_API_KEY: 'test-key' },
    createModelCaller,
    logger,
    now: () => 1_000,
  });
  return { handle, model, createModelCaller, logger };
}

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://stay.example', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function errorOf(response: Response): Promise<ApiErrorBody['error']> {
  return ((await response.json()) as ApiErrorBody).error;
}

describe('GET /api/assistant', () => {
  it('reports live mode and the model when a key is configured', async () => {
    const { handle, createModelCaller } = setup({
      env: { GEMINI_API_KEY: ' key ', GEMINI_MODEL: 'm-1' },
    });
    const response = await handle(new Request(ENDPOINT), CONTEXT);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ mode: 'live', model: 'm-1' });
    expect(createModelCaller).toHaveBeenCalledWith('key', 'm-1');
  });

  it('reports demo mode without a key and never exposes configuration', async () => {
    const { handle, createModelCaller } = setup({ env: {} });
    const response = await handle(new Request(ENDPOINT), CONTEXT);
    expect(await response.json()).toEqual({ mode: 'demo', model: null });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(createModelCaller).not.toHaveBeenCalled();
  });

  it('falls back to the default model', async () => {
    const { handle } = setup();
    expect(await (await handle(new Request(ENDPOINT), CONTEXT)).json()).toEqual({
      mode: 'live',
      model: DEFAULT_MODEL,
    });
  });
});

describe('POST /api/assistant: reply', () => {
  it('answers a guest message', async () => {
    const { handle, model } = setup();
    const response = await handle(post(REPLY), CONTEXT);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      result: { kind: 'reply', text: 'Yes, in the closet.', sources: [] },
      usedSearch: false,
    });
    expect(response.headers.get('x-request-id')).toBeTruthy();
    expect(model).toHaveBeenCalledWith(expect.objectContaining({ useSearch: false }));
    expect(model.mock.calls[0]?.[0].prompt).toContain('Is there an iron?');
  });

  it('turns on search for local questions and returns only safe sources', async () => {
    const answer: ModelResponse = {
      text: 'Try Green Table.',
      sources: [
        { title: 'Green Table', url: 'https://greentable.example/' },
        { title: 'Bad', url: 'javascript:alert(1)' },
      ],
    };
    const { handle, model } = setup({ respond: () => Promise.resolve(answer) });
    const response = await handle(
      post({ ...REPLY, message: 'Can you recommend a vegetarian restaurant?' }),
      CONTEXT,
    );

    expect(model).toHaveBeenCalledWith(expect.objectContaining({ useSearch: true }));
    expect(await response.json()).toEqual({
      result: {
        kind: 'reply',
        text: 'Try Green Table.',
        sources: [{ title: 'Green Table', url: 'https://greentable.example/' }],
      },
      usedSearch: true,
    });
  });

  it('turns model markers into structured actions', async () => {
    const { handle } = setup({
      respond: () => Promise.resolve({ text: 'ESCALATE_TASK: Fix the sink.', sources: [] }),
    });
    const response = await handle(post({ ...REPLY, message: 'The sink is leaking' }), CONTEXT);
    expect(await response.json()).toMatchObject({
      result: { kind: 'maintenance', task: 'Fix the sink.' },
    });
  });
});

describe('POST /api/assistant: scheduled', () => {
  const scheduled = {
    task: 'scheduled',
    kind: 'preArrival',
    guestName: 'Alice',
    propertyName: 'The Penthouse',
  };

  it('returns the generated text', async () => {
    const { handle } = setup({
      respond: () => Promise.resolve({ text: ' See you tomorrow! ', sources: [] }),
    });
    const response = await handle(post(scheduled), CONTEXT);
    expect(await response.json()).toEqual({ text: 'See you tomorrow!' });
  });

  it('treats an empty model answer as an upstream failure', async () => {
    const { handle } = setup({ respond: () => Promise.resolve({ text: '  ', sources: [] }) });
    const response = await handle(post(scheduled), CONTEXT);
    expect(response.status).toBe(502);
  });
});

describe('POST /api/assistant: refusals', () => {
  it.each<[string, Record<string, string>]>([
    ['a missing Origin header', { Origin: '' }],
    ['another site as Origin', { Origin: 'https://evil.example' }],
    ['an unparseable Origin', { Origin: 'null' }],
    ['a cross-site fetch', { 'Sec-Fetch-Site': 'cross-site' }],
  ])('rejects %s before calling the model', async (_label, headers) => {
    const { handle, model } = setup();
    const request = post(REPLY, headers);
    if (headers.Origin === '') request.headers.delete('origin');

    const response = await handle(request, CONTEXT);
    expect(response.status).toBe(403);
    expect((await errorOf(response)).code).toBe('forbidden_origin');
    expect(model).not.toHaveBeenCalled();
  });

  it('returns 503 when no key is configured', async () => {
    const { handle } = setup({ env: {} });
    const response = await handle(post(REPLY), CONTEXT);
    expect(response.status).toBe(503);
    expect((await errorOf(response)).code).toBe('not_configured');
  });

  it('returns 415 for a non-JSON content type', async () => {
    const { handle } = setup();
    const response = await handle(post(REPLY, { 'Content-Type': 'text/plain' }), CONTEXT);
    expect(response.status).toBe(415);
  });

  it('returns 400 for malformed JSON and for an invalid body', async () => {
    const { handle, model } = setup();
    expect((await handle(post('{not json'), CONTEXT)).status).toBe(400);

    const invalid = await handle(post({ ...REPLY, message: '' }), CONTEXT);
    expect(invalid.status).toBe(400);
    expect(await errorOf(invalid)).toEqual({
      code: 'invalid_request',
      message: 'message is required.',
    });
    expect(model).not.toHaveBeenCalled();
  });

  it('returns 413 for an oversized body', async () => {
    const { handle, model } = setup();
    const response = await handle(
      post({ ...REPLY, message: 'x'.repeat(LIMITS.requestBytes) }),
      CONTEXT,
    );
    expect(response.status).toBe(413);
    expect(model).not.toHaveBeenCalled();
  });

  it('returns 405 for other methods', async () => {
    const { handle } = setup();
    const response = await handle(new Request(ENDPOINT, { method: 'DELETE' }), CONTEXT);
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET, HEAD, POST');
  });

  it('accepts the public host a reverse proxy reports', async () => {
    const { handle } = setup();
    const proxied = new Request('http://10.0.0.5:3000/api/assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://stay.example',
        'X-Forwarded-Host': 'stay.example',
      },
      body: JSON.stringify(REPLY),
    });
    expect((await handle(proxied, CONTEXT)).status).toBe(200);
  });

  it('accepts a full-length message written in a multi-byte script', async () => {
    const { handle } = setup();
    const response = await handle(
      post({ ...REPLY, message: '房'.repeat(LIMITS.guestMessage) }),
      CONTEXT,
    );
    expect(response.status).toBe(200);
  });

  it('does not let one client spend the budget shared by everyone', async () => {
    const { handle } = setup();
    const noisy = { clientId: '192.0.2.1' };
    const attempts = RATE_LIMITS.global.limit * 3;
    for (let count = 0; count < attempts; count += 1) await handle(post(REPLY), noisy);

    expect((await handle(post(REPLY), noisy)).status).toBe(429);
    expect((await handle(post(REPLY), { clientId: '192.0.2.2' })).status).toBe(200);
  });

  it('rate-limits one client without blocking another', async () => {
    const { handle } = setup();
    const { limit } = RATE_LIMITS.perClient;
    for (let count = 0; count < limit; count += 1) {
      expect((await handle(post(REPLY), CONTEXT)).status).toBe(200);
    }

    const blocked = await handle(post(REPLY), CONTEXT);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('retry-after')).toBe('60');
    expect((await handle(post(REPLY), { clientId: '198.51.100.9' })).status).toBe(200);
  });
});

describe('POST /api/assistant: upstream failures', () => {
  const failing = (error: unknown) => setup({ respond: () => Promise.reject(error) });

  it('maps a provider error to 502 without leaking its details', async () => {
    const secret = 'quota exceeded for key AIza-secret';
    const { handle, logger } = failing(
      new UpstreamError('Gemini API responded with status 429', {
        timedOut: false,
        status: 429,
        cause: new Error(secret),
      }),
    );
    const response = await handle(post(REPLY), CONTEXT);
    const body = await response.text();

    expect(response.status).toBe(502);
    expect(body).toContain('upstream_error');
    expect(body).not.toContain('AIza');
    expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ upstreamStatus: 429 }));
  });

  it('maps a timeout to 504', async () => {
    const { handle } = failing(
      new UpstreamError('timed out', { timedOut: true, status: null, cause: null }),
    );
    const response = await handle(post(REPLY), CONTEXT);
    expect(response.status).toBe(504);
    expect((await errorOf(response)).code).toBe('upstream_timeout');
  });

  it('maps an unexpected error to 500 with a generic message', async () => {
    const { handle } = failing(new TypeError('cannot read properties of undefined'));
    const response = await handle(post(REPLY), CONTEXT);
    expect(response.status).toBe(500);
    expect(await errorOf(response)).toEqual({
      code: 'internal_error',
      message: 'Something went wrong on the server.',
    });
  });

  it('never logs guest text, names, or the client address', async () => {
    const { handle, logger } = setup();
    await handle(
      post({ ...REPLY, guestName: 'Zelda Fitzgerald', message: 'my secret plans' }),
      CONTEXT,
    );
    const logged = JSON.stringify(vi.mocked(logger.info).mock.calls);
    expect(logged).not.toMatch(/Zelda|secret plans|203\.0\.113\.7/);
  });
});
