import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Guards the colour tokens in index.css. If someone retunes the palette, these
 * checks say whether text is still readable before a person has to notice.
 */

const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');

function readTokens(block: string): Record<string, string> {
  return Object.fromEntries(
    [...block.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((match) => [match[1], match[2]]),
  ) as Record<string, string>;
}

const darkStart = css.indexOf('@media (prefers-color-scheme: dark)');
const themeStart = css.indexOf('@theme');
const themes = {
  light: readTokens(css.slice(0, darkStart)),
  dark: readTokens(css.slice(darkStart, themeStart)),
};

function luminance(hex: string): number {
  const value = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => {
    const share = channel / 255;
    return share <= 0.03928 ? share / 12.92 : ((share + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].toSorted(
    (a, b) => b - a,
  ) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}

/** The colour of `share` of `top` painted over `base`, as bg-accent/15 does. */
function blend(top: string, base: string, share: number): string {
  const [a, b] = [Number.parseInt(top.slice(1), 16), Number.parseInt(base.slice(1), 16)];
  const channel = (shift: number) =>
    Math.round(((a >> shift) & 255) * share + ((b >> shift) & 255) * (1 - share))
      .toString(16)
      .padStart(2, '0');
  return `#${channel(16)}${channel(8)}${channel(0)}`;
}

const SURFACES = ['canvas', 'surface', 'well', 'hover'] as const;
const TONES = ['success', 'info', 'warning', 'danger', 'neutral'] as const;
const AA_TEXT = 4.5;
const AA_UI = 3;

describe.each(Object.entries(themes))('%s theme', (_name, token) => {
  const color = (name: string) => {
    const value = token[name];
    if (!value) throw new Error(`Token --${name} is missing from index.css`);
    return value;
  };

  it('defines every token', () => {
    expect(Object.keys(token).toSorted()).toEqual(Object.keys(themes.light).toSorted());
  });

  it.each(SURFACES)('body and secondary text are readable on %s', (surface) => {
    expect(contrast(color('ink'), color(surface))).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(color('ink-muted'), color(surface))).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each(TONES)('%s badges are readable', (tone) => {
    expect(contrast(color(`${tone}-ink`), color(`${tone}-wash`))).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('status colours used as text are readable on panels and wells', () => {
    for (const tone of TONES) {
      for (const surface of ['surface', 'well'] as const) {
        expect(
          contrast(color(`${tone}-ink`), color(surface)),
          `${tone} on ${surface}`,
        ).toBeGreaterThanOrEqual(AA_TEXT);
      }
    }
  });

  it('the primary button label is readable on the gold fill, including on hover', () => {
    expect(contrast(color('on-accent'), color('accent'))).toBeGreaterThanOrEqual(AA_TEXT);
    const hover = blend(color('accent'), color('surface'), 0.85);
    expect(contrast(color('on-accent'), hover)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('text on a selected (gold-tinted) card is readable', () => {
    for (const base of ['surface', 'well'] as const) {
      const selected = blend(color('accent'), color(base), 0.15);
      expect(contrast(color('ink'), selected)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrast(color('ink-muted'), selected)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrast(color('accent-ink'), selected)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it('control borders, selection edges, and focus rings stand out from what is behind them', () => {
    for (const surface of SURFACES) {
      for (const edge of ['line-strong', 'accent-edge', 'focus'] as const) {
        expect(
          contrast(color(edge), color(surface)),
          `${edge} on ${surface}`,
        ).toBeGreaterThanOrEqual(AA_UI);
      }
    }
  });

  it('the focus ring is visible against the primary button', () => {
    expect(contrast(color('focus'), color('canvas'))).toBeGreaterThanOrEqual(AA_UI);
  });
});
