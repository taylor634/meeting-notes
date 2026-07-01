export interface RecurringMeeting {
  id: string;
  title: string;
  description: string | null;
  cadence: string;
  color: string;
  emoji: string | null;
  participants: string;
  pinned: boolean;
  archived: boolean;
  nextDate: string | null;
  zoomLink: string | null;
  zoomMeetingId: string | null;
  createdAt: string;
  updatedAt: string;
  occurrences?: MeetingOccurrence[];
  _count?: { occurrences: number };
  outstandingActionItems?: number;
  lastOccurrence?: MeetingOccurrence | null;
}

export interface MeetingOccurrence {
  id: string;
  meetingId: string;
  date: string;
  title: string | null;
  summary: string | null;
  notes: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  meeting?: RecurringMeeting;
  actionItems?: ActionItem[];
  questions?: OpenQuestion[];
  decisions?: Decision[];
}

export interface ActionItem {
  id: string;
  occurrenceId: string;
  meetingId: string;
  text: string;
  owner: string | null;
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
  rolledFromId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OpenQuestion {
  id: string;
  occurrenceId: string;
  text: string;
  resolved: boolean;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface Decision {
  id: string;
  occurrenceId: string;
  text: string;
  createdAt: string;
}
