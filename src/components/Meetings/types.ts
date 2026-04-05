// Types and interfaces for Meeting Manager
export type MeetingStatus = 'scheduled' | 'live' | 'completed' | 'canceled';

export type AiStatus = 'idle' | 'listening' | 'summarizing' | 'done';

export type MeetingFilter = 'all' | 'upcoming' | 'live' | 'past' | 'canceled';

export type MeetingProvider = 'meetsync' | 'google';

export type TaskStatus =
  | 'pending'
  | 'in-progress'
  | 'completed'
  | 'canceled'
  // additional tokens used across the UI
  | 'planned'
  | 'in_progress'
  | 'done';

export type TaskPriority = 'low' | 'medium' | 'high';

export interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  time: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  duration?: number;
  durationMinutes?: number;
  timezone?: string;
  description: string;
  participants: string[];
  host?: string;
  roomId?: string;
  meetingCode: string;
  link?: string;
  googleMeetUrl?: string;
  provider: MeetingProvider;
  externalEventId?: string;
  status: MeetingStatus;
  transcript: TranscriptEntry[];
  summary?: string;
  aiStatus: AiStatus;
  transcriptCursor: number;
  isRecurring?: boolean;
  recurrencePattern?: 'daily' | 'weekly' | 'monthly';
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  // Optional scheduling fields used by meeting-related task utilities
  date?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  meetingId: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo?: string;
  dueDate?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MeetingFormState {
  title: string;
  description: string;
  date: string;
  time: string;
  duration: number;
  durationMinutes?: number;
  participants: string[];
  roomId: string;
  useGoogleMeet?: boolean;
  isRecurring: boolean;
  recurrencePattern: 'daily' | 'weekly' | 'monthly';
  sendInvites: boolean;
  invitedUserIds?: string[];
}

export interface TaskFormState {
  title: string;
  description: string;
  meetingId: string;
  priority: TaskPriority;
  assignedTo: string;
  dueDate: string;
  date?: string;
  startTime?: string;
  durationMinutes?: number;
  tags?: string;
}

export interface MeetingManagerProps {
  plannerRequestId?: number;
  pendingCall?: { contactId: string; type: 'video'; roomId?: string } | null;
  onCallStarted?: () => void;
}
