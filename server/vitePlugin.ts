import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { loadEnv, type Connect, type Plugin } from 'vite';
import { ASSISTANT_ENDPOINT } from '../shared/assistant.js';
import { createAssistantHandler, type AssistantHandler } from './handler.js';
import { SECURITY_HEADERS } from './securityHeaders.js';

/**
 * The request's URL, with the host taken from the Host header only.
 *
 * A request target such as `//other.example/api/assistant` would otherwise be
 * read as a URL on another host, and the same-origin check compares against
 * this host. Appending the target to the origin keeps it a path. A target that
 * does not form a valid URL returns null.
 */
function requestUrl(incoming: IncomingMessage): URL | null {
  const target = incoming.url ?? '/';
  if (!target.startsWith('/')) return null;
  try {
    return new URL(`http://${incoming.headers.host ?? 'localhost'}${target}`);
  } catch {
    return null;
  }
}

function toWebRequest(incoming: IncomingMessage, url: URL): Request {
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
  url: URL,
  incoming: IncomingMessage,
  outgoing: ServerResponse,
  next: Connect.NextFunction,
): Promise<void> {
  try {
    const response = await handler(toWebRequest(incoming, url), {
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
    const url = requestUrl(incoming);
    if (!handle || url?.pathname !== ASSISTANT_ENDPOINT) {
      next();
      return;
    }
    void respond(handle, url, incoming, outgoing, next);
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
