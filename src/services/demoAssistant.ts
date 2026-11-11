import { format, parseISO } from 'date-fns';
import type { AssistantResult, ReplyRequest, ReplyResponse } from '../../shared/assistant';
import { CANNED_REPLY } from '../../shared/cannedReplies';
import { classifyTopic } from '../../shared/topics';

type ReplyInput = Omit<ReplyRequest, 'task'>;

const formatDay = (isoDate: string) => format(parseISO(isoDate), 'MMM d, yyyy');
const reply = (text: string): AssistantResult => ({ kind: 'reply', text, sources: [] });
const escalate = (reason: string): AssistantResult => ({ kind: 'escalation', reason });

/** Quotes the sentence that describes the fault, so the task reads as the guest reported it. */
function repairTask(message: string): string {
  const sentences = message.match(/[^.!?]+[.!?]*/g) ?? [message];
  const faulty = sentences.find((sentence) => classifyTopic(sentence) === 'maintenance') ?? message;
  return `Guest reports: "${faulty.trim().slice(0, 160)}"`;
}

function amenityReply(message: string): string {
  const answers = [
    /\bcoffee\b|\bkeurig\b/i.test(message) && CANNED_REPLY.coffeeMaker,
    /\biron/i.test(message) && CANNED_REPLY.iron,
    /\bhair\s?dryer\b|\bblow dryer\b/i.test(message) && CANNED_REPLY.hairdryer,
  ].filter((answer) => answer !== false);
  return answers.join(' ');
}

function bookingReply({ stay }: ReplyInput): AssistantResult {
  if (!stay)
    return escalate('No booking is on file for this guest, so the host needs to follow up.');
  return reply(
    `Your booking at ${stay.propertyName} from ${formatDay(stay.checkIn)} to ${formatDay(stay.checkOut)} is confirmed. Let us know if you have any questions before you arrive.`,
  );
}

/**
 * Stand-in for the model when no API key is configured.
 *
 * It answers from the same house wording the model is given and escalates
 * everything it has no script for. It never invents an answer, so the dashboard
 * stays honest about what a rule-based responder can do.
 */
export function demoReply(input: ReplyInput): ReplyResponse {
  const result = ((): AssistantResult => {
    switch (classifyTopic(input.message)) {
      case 'safety':
        return escalate('Safety concerns go straight to the host.');
      case 'maintenance':
        return { kind: 'maintenance', task: repairTask(input.message) };
      case 'complaint':
        return escalate('Complaints need a personal reply from the host.');
      case 'billing':
        return escalate("Refunds and charges are the host's decision.");
      case 'pets':
        return escalate("Pet policy questions need the host's decision.");
      case 'lost_property':
        return escalate('Lost property needs someone to check the rooms.');
      case 'cancellation':
        return reply(CANNED_REPLY.cancellation);
      case 'stay_change':
        return reply(CANNED_REPLY.stayChange);
      case 'check_in':
        return reply(CANNED_REPLY.checkIn);
      case 'wifi':
        return reply(CANNED_REPLY.wifi);
      case 'amenities':
        return reply(amenityReply(input.message));
      case 'local_recommendations':
        return reply(
          "I can't look up local listings right now. Your host knows the area well and can share personal recommendations.",
        );
      case 'booking':
        return bookingReply(input);
      case 'general':
        return escalate('The demo responder has no scripted answer for this message.');
    }
  })();

  return { result, usedSearch: false };
}
