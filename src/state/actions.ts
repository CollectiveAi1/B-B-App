import type { AssistantResult } from '../../shared/assistant';
import type {
  AutomatedMessageKind,
  CleaningStatus,
  InboxCheckSource,
  MaintenanceStatus,
  Rating,
} from '../types';

/**
 * Every change to dashboard state. Actions carry their own timestamp: the
 * reducer never reads the clock, which keeps it pure and easy to test.
 */
export type DashboardAction =
  | { type: 'clock/ticked'; now: Date }
  | { type: 'inbox/checked'; source: InboxCheckSource; timestamp: Date }
  | { type: 'message/processingStarted'; messageId: string }
  | {
      type: 'message/resolved';
      messageId: string;
      result: AssistantResult;
      usedSearch: boolean;
      timestamp: Date;
    }
  | { type: 'message/failed'; messageId: string; reason: string; timestamp: Date }
  | { type: 'message/retryRequested'; messageId: string }
  | {
      type: 'automatedMessage/sent';
      bookingId: string;
      trigger: AutomatedMessageKind;
      body: string;
      /** 'template' when the assistant was unavailable and fixed wording went out instead. */
      origin: 'assistant' | 'template';
      timestamp: Date;
    }
  | { type: 'cleaning/statusChanged'; taskId: string; status: CleaningStatus; timestamp: Date }
  | { type: 'cleaning/itemToggled'; taskId: string; itemId: string; done: boolean; timestamp: Date }
  | {
      type: 'cleaning/photoAttached';
      taskId: string;
      itemId: string;
      photoUrl: string;
      timestamp: Date;
    }
  | {
      type: 'maintenance/statusChanged';
      taskId: string;
      status: MaintenanceStatus;
      timestamp: Date;
    }
  | { type: 'staff/clockToggled'; staffId: string; timestamp: Date }
  | { type: 'crewNote/added'; text: string; timestamp: Date }
  | {
      type: 'incident/reported';
      staffId: string;
      propertyId: string;
      description: string;
      timestamp: Date;
    }
  | { type: 'review/added'; bookingId: string; rating: Rating; comment: string; timestamp: Date };
