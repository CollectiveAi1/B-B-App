import { describe, expect, it } from 'vitest';
import { LIMITS } from './assistant.js';
import { parseAssistantText, sanitizeSources } from './protocol.js';

describe('parseAssistantText', () => {
  it('returns a plain reply with its sources', () => {
    const sources = [{ title: 'Guide', url: 'https://example.com/' }];
    expect(parseAssistantText('  Check-in is after 3 PM.  ', sources)).toEqual({
      kind: 'reply',
      text: 'Check-in is after 3 PM.',
      sources,
    });
  });

  it('reads a maintenance task', () => {
    expect(
      parseAssistantText('ESCALATE_TASK: Fix slow water leak under the kitchen sink.'),
    ).toEqual({
      kind: 'maintenance',
      task: 'Fix slow water leak under the kitchen sink.',
    });
  });

  it('reads a general escalation', () => {
    expect(parseAssistantText('ESCALATE: Pet policy needs the host.')).toEqual({
      kind: 'escalation',
      reason: 'Pet policy needs the host.',
    });
  });

  it('keeps the first letter when the model leaves out the space after the marker', () => {
    expect(parseAssistantText('ESCALATE:Security concern')).toEqual({
      kind: 'escalation',
      reason: 'Security concern',
    });
    expect(parseAssistantText('ESCALATE_TASK:Replace bulb')).toEqual({
      kind: 'maintenance',
      task: 'Replace bulb',
    });
  });

  it('tolerates markdown and whitespace around the marker', () => {
    expect(parseAssistantText('\n**ESCALATE_TASK:** Fix the Wi-Fi.**')).toEqual({
      kind: 'maintenance',
      task: 'Fix the Wi-Fi.',
    });
    expect(parseAssistantText('  escalate: needs a person')).toMatchObject({ kind: 'escalation' });
  });

  it('removes emphasis markers without leaving one half of a pair behind', () => {
    expect(parseAssistantText('ESCALATE_TASK: Restart the `router` in the **hall**')).toEqual({
      kind: 'maintenance',
      task: 'Restart the router in the hall',
    });
  });

  it('falls back to a usable description when the marker has no text', () => {
    expect(parseAssistantText('ESCALATE_TASK:')).toMatchObject({ kind: 'maintenance' });
    expect(parseAssistantText('ESCALATE_TASK:').kind === 'maintenance').toBe(true);
    const escalation = parseAssistantText('ESCALATE:   ');
    expect(escalation.kind === 'escalation' && escalation.reason.length > 0).toBe(true);
  });

  it('escalates an empty model response instead of sending the guest a blank reply', () => {
    expect(parseAssistantText('   ')).toMatchObject({ kind: 'escalation' });
  });

  it('caps reply length', () => {
    const result = parseAssistantText('a'.repeat(LIMITS.replyText + 500));
    expect(result.kind === 'reply' && result.text.length).toBe(LIMITS.replyText);
  });
});

describe('sanitizeSources', () => {
  it('keeps http and https links and drops everything else', () => {
    const sources = sanitizeSources([
      { title: 'Safe', url: 'https://example.com/a' },
      { title: 'Script', url: 'javascript:alert(1)' },
      { title: 'Data', url: 'data:text/html,<script>alert(1)</script>' },
      { title: 'Broken', url: 'not a url' },
      { title: 'Missing' },
      { title: 'Plain', url: 'http://example.org/' },
    ]);
    expect(sources.map((source) => source.title)).toEqual(['Safe', 'Plain']);
  });

  it('removes duplicates and uses the hostname when a title is missing', () => {
    expect(
      sanitizeSources([
        { url: 'https://www.example.com/a' },
        { title: 'Again', url: 'https://www.example.com/a' },
      ]),
    ).toEqual([{ title: 'example.com', url: 'https://www.example.com/a' }]);
  });

  it('caps the number of sources', () => {
    const many = Array.from({ length: 20 }, (_, index) => ({
      url: `https://example.com/${index}`,
    }));
    expect(sanitizeSources(many)).toHaveLength(LIMITS.sources);
  });
});
