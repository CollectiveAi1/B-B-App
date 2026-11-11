import { ApiError, GoogleGenAI } from '@google/genai';
import type { Source } from '../shared/assistant.js';
import { UPSTREAM_ATTEMPT_TIMEOUT_MS, UPSTREAM_DEADLINE_MS } from './config.js';

export interface ModelRequest {
  systemInstruction: string;
  prompt: string;
  useSearch: boolean;
}

export interface ModelResponse {
  /** Empty when the model returned nothing, for example after a safety block. */
  text: string;
  /** Web pages the answer was grounded on. Unvalidated: sanitize before use. */
  sources: Partial<Source>[];
}

export type ModelCaller = (request: ModelRequest) => Promise<ModelResponse>;

/** Raised for any failure reaching or hearing back from the model. */
export class UpstreamError extends Error {
  readonly timedOut: boolean;
  readonly status: number | null;

  constructor(
    message: string,
    options: { timedOut: boolean; status: number | null; cause: unknown },
  ) {
    super(message, { cause: options.cause });
    this.name = 'UpstreamError';
    this.timedOut = options.timedOut;
    this.status = options.status;
  }
}

function toUpstreamError(error: unknown): UpstreamError {
  if (error instanceof ApiError) {
    return new UpstreamError(`Gemini API responded with status ${error.status}`, {
      timedOut: error.status === 408 || error.status === 504,
      status: error.status,
      cause: error,
    });
  }
  const name = error instanceof Error ? error.name : '';
  const timedOut = name === 'AbortError' || name === 'TimeoutError';
  return new UpstreamError(timedOut ? 'Gemini API call timed out' : 'Gemini API call failed', {
    timedOut,
    status: null,
    cause: error,
  });
}

export function createGeminiCaller(apiKey: string, model: string): ModelCaller {
  const client = new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: UPSTREAM_ATTEMPT_TIMEOUT_MS,
      // One retry covers a transient 429 or 5xx without stacking long delays on the guest's wait.
      retryOptions: { attempts: 2 },
    },
  });

  return async ({ systemInstruction, prompt, useSearch }) => {
    try {
      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          // Caps the total across retries. Without it two slow attempts outlive the function.
          abortSignal: AbortSignal.timeout(UPSTREAM_DEADLINE_MS),
          ...(useSearch ? { tools: [{ googleSearch: {} }] } : {}),
        },
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      return {
        text: response.text ?? '',
        sources: chunks.map((chunk) => ({ title: chunk.web?.title, url: chunk.web?.uri })),
      };
    } catch (error) {
      throw toUpstreamError(error);
    }
  };
}
