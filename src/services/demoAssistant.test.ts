import { describe, expect, it } from 'vitest';
import { CANNED_REPLY } from '../../shared/cannedReplies';
import { demoReply } from './demoAssistant';

const ask = (message: string, stay: Parameters<typeof demoReply>[0]['stay'] = null) =>
  demoReply({ guestName: 'Guest', message, stay }).result;

describe('demoReply', () => {
  it('answers common questions with the house wording', () => {
    expect(ask('What time is check-in?')).toEqual({
      kind: 'reply',
      text: CANNED_REPLY.checkIn,
      sources: [],
    });
    expect(ask('Where is the wifi password?')).toMatchObject({ text: CANNED_REPLY.wifi });
    expect(ask('Can I cancel my booking?')).toMatchObject({ text: CANNED_REPLY.cancellation });
    expect(ask('Can we check in early?')).toMatchObject({ text: CANNED_REPLY.stayChange });
  });

  it('answers every amenity the guest asks about', () => {
    expect(ask('Is there a hairdryer and an iron?')).toMatchObject({
      text: `${CANNED_REPLY.iron} ${CANNED_REPLY.hairdryer}`,
    });
    expect(ask('Do you have a coffee maker?')).toMatchObject({ text: CANNED_REPLY.coffeeMaker });
  });

  it('turns a fault into a repair task that quotes the guest', () => {
    expect(ask('Lovely place. The kitchen tap is leaking. Thanks!')).toEqual({
      kind: 'maintenance',
      task: 'Guest reports: "The kitchen tap is leaking."',
    });
  });

  it('escalates what only the host can decide', () => {
    for (const message of [
      'Do you allow dogs?',
      'I want a refund.',
      'The room was filthy.',
      'I smell gas in the kitchen!',
      'I left my charger behind.',
      'Hello there',
    ]) {
      expect(ask(message).kind, message).toBe('escalation');
    }
  });

  it('confirms a booking from the stay on file and escalates when there is none', () => {
    const stay = { propertyName: 'The Penthouse', checkIn: '2026-11-11', checkOut: '2026-11-15' };
    expect(ask('Is my reservation confirmed?', stay)).toMatchObject({
      kind: 'reply',
      text: expect.stringContaining('The Penthouse from Nov 11, 2026 to Nov 15, 2026'),
    });
    expect(ask('Is my reservation confirmed?').kind).toBe('escalation');
  });

  it('does not invent local recommendations', () => {
    const result = ask('Can you recommend a restaurant nearby?');
    expect(result).toMatchObject({ kind: 'reply', sources: [] });
    expect(result.kind === 'reply' && result.text).toContain("can't look up");
  });

  it('never claims to have searched', () => {
    expect(
      demoReply({ guestName: 'G', message: 'Any events this weekend?', stay: null }).usedSearch,
    ).toBe(false);
  });
});
