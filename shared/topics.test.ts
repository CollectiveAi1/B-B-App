import { describe, expect, it } from 'vitest';
import { classifyTopic, type Topic } from './topics.js';

describe('classifyTopic', () => {
  const cases: [string, Topic][] = [
    ["Can you confirm the check-in instructions? We're arriving late, around 11 PM.", 'check_in'],
    ['Do you allow pets? I have a small, well-behaved corgi.', 'pets'],
    ["The Wi-Fi password you provided doesn't seem to be working.", 'maintenance'],
    ['We noticed a water leak under the kitchen sink.', 'maintenance'],
    ['One of the bedroom lights flickers and the outlet has no power.', 'maintenance'],
    ["The back door lock is broken and won't latch.", 'maintenance'],
    ['Where can I find the Wi-Fi password?', 'wifi'],
    ['Is there a hairdryer and an iron at the apartment?', 'amenities'],
    ['What is your cancellation policy if our plans change?', 'cancellation'],
    ['Is it possible to check in a bit early, around noon?', 'stay_change'],
    ['Could we get a late check-out on Sunday?', 'stay_change'],
    [
      'Can you recommend some good vegetarian restaurants near the Cozy Cottage?',
      'local_recommendations',
    ],
    ['I think I left my phone charger in the bedroom.', 'lost_property'],
    ['I would like a refund for the first night.', 'billing'],
    ['The bathroom was dirty when we arrived.', 'complaint'],
    ['There is a strong gas smell in the kitchen.', 'safety'],
    ['Just checking that my reservation went through.', 'booking'],
    ['Thanks so much, see you soon!', 'general'],
  ];

  it.each(cases)('%s → %s', (message, topic) => {
    expect(classifyTopic(message)).toBe(topic);
  });

  it('puts a repair ahead of a recommendation request in the same message', () => {
    expect(classifyTopic('Can you recommend a plumber? The sink is leaking.')).toBe('maintenance');
  });

  it('does not mistake a phone charger for a billing question', () => {
    expect(classifyTopic('Is there a charger for an electric car?')).not.toBe('billing');
  });

  it('matches whole words only', () => {
    expect(classifyTopic('We had a slightly delayed flight.')).toBe('general');
  });
});
