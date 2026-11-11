import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SECURITY_HEADERS } from './securityHeaders.js';

interface VercelConfig {
  headers: { source: string; headers: { key: string; value: string }[] }[];
  functions: Record<string, unknown>;
}

const vercel = JSON.parse(
  readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'),
) as VercelConfig;

describe('security headers', () => {
  it('match between the local preview server and vercel.json', () => {
    const deployed = Object.fromEntries(
      vercel.headers.flatMap((rule) => rule.headers.map(({ key, value }) => [key, value])),
    );
    expect(deployed).toEqual(SECURITY_HEADERS);
  });

  it('apply to every path', () => {
    expect(vercel.headers.map((rule) => rule.source)).toEqual(['/(.*)']);
  });

  it('allow nothing from other origins and no inline script', () => {
    const policy = SECURITY_HEADERS['Content-Security-Policy'] ?? '';
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).not.toMatch(/unsafe-inline|unsafe-eval|https?:/);
  });

  it('configures the function file that exists', () => {
    expect(Object.keys(vercel.functions)).toEqual(['api/assistant.ts']);
    expect(() => readFileSync(new URL('../api/assistant.ts', import.meta.url))).not.toThrow();
  });
});
