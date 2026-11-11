import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { loadEnv, type Connect, type Plugin } from 'vite';
import { ASSISTANT_ENDPOINT } from '../shared/assistant.js';
import { createAssistantHandler, type AssistantHandler } from './handler.js';
import { SECURITY_HEADERS } from './securityHeaders.js';

function toWebRequest(incoming: IncomingMessage): Request {
  const url = new URL(incoming.url ?? '/', `http://${incoming.headers.host ?? 'localhost'}`);
  const headers = new Headers();
  for (const [name, value] of Object.entries(incoming.headers)) {
    if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
  }

  const hasBody = incoming.method !== 'GET' && incoming.method !== 'HEAD';
  return new Request(url, {
    method: incoming.method,
    headers,
    body: hasBody ? (Readable.toWeb(incoming) as ReadableStream<Uint8Array>) : null,
    // Node requires this flag whenever a request body is a stream.
    duplex: 'half',
  });
}

async function sendWebResponse(
  response: Response,
  outgoing: ServerResponse,
  method: string | undefined,
): Promise<void> {
  outgoing.statusCode = response.status;
  response.headers.forEach((value, name) => outgoing.setHeader(name, value));
  outgoing.end(method === 'HEAD' ? undefined : await response.text());
}

async function respond(
  handler: AssistantHandler,
  incoming: IncomingMessage,
  outgoing: ServerResponse,
  next: Connect.NextFunction,
): Promise<void> {
  try {
    const response = await handler(toWebRequest(incoming), {
      clientId: incoming.socket.remoteAddress ?? 'local',
    });
    await sendWebResponse(response, outgoing, incoming.method);
  } catch (error) {
    next(error);
  }
}

/**
 * Serves /api/assistant from the Vite dev and preview servers, using the same
 * handler that runs in production. GEMINI_API_KEY is read from .env files here,
 * in the Node process, and is never passed to client code.
 */
export function assistantApi(): Plugin {
  let handle: AssistantHandler | null = null;

  const middleware: Connect.NextHandleFunction = (incoming, outgoing, next) => {
    const pathname = new URL(incoming.url ?? '/', 'http://localhost').pathname;
    if (!handle || pathname !== ASSISTANT_ENDPOINT) {
      next();
      return;
    }
    void respond(handle, incoming, outgoing, next);
  };

  return {
    name: 'reservation-assistant-api',
    configResolved(config) {
      const env = loadEnv(config.mode, config.envDir || config.root, '');
      handle = createAssistantHandler({ env });
    },
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      // Preview serves the production build, so it also gets the production
      // headers. That makes a local preview a faithful check of the CSP.
      server.middlewares.use((_incoming, outgoing, next) => {
        for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
          outgoing.setHeader(name, value);
        }
        next();
      });
      server.middlewares.use(middleware);
    },
  };
}
