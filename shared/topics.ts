/**
 * Keyword classifier for guest messages.
 *
 * Three callers depend on it: the server decides whether a message needs live
 * web search, the demo responder picks its scripted answer, and the activity
 * log labels what a guest asked about. Keeping one rule list stops those three
 * from drifting apart.
 */

export type Topic =
  | 'safety'
  | 'maintenance'
  | 'complaint'
  | 'billing'
  | 'pets'
  | 'lost_property'
  | 'cancellation'
  | 'stay_change'
  | 'check_in'
  | 'wifi'
  | 'amenities'
  | 'local_recommendations'
  | 'booking'
  | 'general';

interface TopicRule {
  topic: Exclude<Topic, 'general'>;
  pattern: RegExp;
}

const NEGATED_VERB =
  /\b(?:not|isn['’]?t|aren['’]?t|doesn['’]?t|don['’]?t|won['’]?t|stopped|no longer)\s+(?:seem(?:s)?\s+to\s+)?(?:be\s+)?(?:work|turn|flush|latch|lock|open|clos|heat|drain|charg)(?:e|es|ing)?\b/i;

/**
 * Ordered by priority: the first rule that matches wins. Safety and repairs sit
 * above everything else so that "can you recommend a plumber, the sink is
 * leaking" becomes a repair task instead of a restaurant search.
 */
const RULES: readonly TopicRule[] = [
  {
    topic: 'safety',
    pattern:
      /\b(?:emergency|unsafe|smoke|smell of gas|gas smell|gas leak|on fire|injur(?:y|ed)|locked out|break-?in|stolen|police|ambulance)\b/i,
  },
  {
    topic: 'maintenance',
    pattern:
      /\b(?:leak(?:s|ing|ed|y)?|drip(?:s|ping)?|broken|clogged|flood(?:ed|ing)?|flicker(?:s|ing)?|out of order|no (?:hot water|power|heat|heating|electricity))\b/i,
  },
  { topic: 'maintenance', pattern: NEGATED_VERB },
  {
    topic: 'complaint',
    pattern:
      /\b(?:dirty|filthy|unclean|complain(?:t|ts|ing)?|unacceptable|disappointed|nois(?:e|y))\b/i,
  },
  {
    topic: 'billing',
    pattern: /\b(?:refund(?:s|ed)?|compensation|discount|overcharged|charged?)\b/i,
  },
  {
    topic: 'pets',
    pattern: /\b(?:pets?|dogs?|cats?|pupp(?:y|ies)|corgi|service animal)\b/i,
  },
  {
    topic: 'lost_property',
    pattern: /\b(?:left|forgot|lost)\s+(?:my|our|a|an|the|behind)\b/i,
  },
  { topic: 'cancellation', pattern: /\bcancel(?:s|l?ed|l?ing|lation)?\b/i },
  {
    topic: 'stay_change',
    pattern:
      /\bearl(?:y|ier)\b[^.?!]*\bcheck[\s-]?in\b|\bcheck[\s-]?in\b[^.?!]*\bearl(?:y|ier)\b|\barrive early\b|\blater?\b[^.?!]*\bcheck[\s-]?out\b|\bcheck[\s-]?out\b[^.?!]*\blater?\b|\bleave later\b/i,
  },
  {
    topic: 'check_in',
    pattern:
      /\bcheck[\s-]?in\b|\barriv(?:e|al|ing)\b|\b(?:key|door|access|lockbox) code\b|\blockbox\b|\bget(?:ting)? (?:in|inside|the key)\b/i,
  },
  { topic: 'wifi', pattern: /\bwi-?fi\b|\binternet\b|\bnetwork name\b/i },
  {
    topic: 'amenities',
    pattern:
      /\bcoffee (?:maker|machine)\b|\bkeurig\b|\bmake coffee\b|\biron(?:ing board)?\b|\bhair\s?dryer\b|\bblow dryer\b/i,
  },
  {
    topic: 'local_recommendations',
    pattern:
      /\brecommend(?:ation|ations|ed)?\b|\brestaurants?\b|\battractions?\b|\bevents?\b|\b(?:what|things) to do\b|\blocal spots?\b|\bbest places?\b|\bopen(?:ing)? hours\b|\bnearby\b/i,
  },
  { topic: 'booking', pattern: /\b(?:booking|booked|reservation|reserved)\b/i },
];

export function classifyTopic(message: string): Topic {
  return RULES.find((rule) => rule.pattern.test(message))?.topic ?? 'general';
}

/** Short noun phrases for log lines such as "Replied to Alice about check-in". */
export const TOPIC_LABEL: Readonly<Record<Topic, string>> = {
  safety: 'a safety concern',
  maintenance: 'a repair',
  complaint: 'a complaint',
  billing: 'billing',
  pets: 'pets',
  lost_property: 'lost property',
  cancellation: 'cancellation',
  stay_change: 'early check-in or late check-out',
  check_in: 'check-in',
  wifi: 'Wi-Fi',
  amenities: 'amenities',
  local_recommendations: 'local recommendations',
  booking: 'their booking',
  general: 'a general question',
};
