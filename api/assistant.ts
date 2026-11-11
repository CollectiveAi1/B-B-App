import { createAssistantHandler } from '../server/handler.js';

/**
 * Vercel Function for /api/assistant.
 *
 * GEMINI_API_KEY is read from the project's environment variables, on the
 * server, and never reaches the browser.
 */
const handle = createAssistantHandler({ env: process.env });

/** Vercel sets these headers itself and overwrites client-supplied values, so they can be trusted here. */
function clientIdOf(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return request.headers.get('x-real-ip') ?? forwardedFor ?? 'unknown';
}

export default {
  fetch(request: Request): Promise<Response> {
    return handle(request, { clientId: clientIdOf(request) });
  },
};
