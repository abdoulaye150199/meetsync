// Utilities and constants extracted from MeetingManager
import { jsPDF } from 'jspdf';
import type {
  Meeting,
  MeetingFilter,
  MeetingFormState,
  MeetingProvider,
  MeetingStatus,
  AiStatus,
  Task,
  TaskFormState,
  TaskPriority,
  TranscriptEntry,
} from './types';

export const STORAGE_KEY = 'meetsync.meetings.v1';
export const TASKS_STORAGE_KEY = 'meetsync.tasks.v1';
export const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

export const getTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

export const safeUUID = () => {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (randomUUID) {
    return randomUUID.call(globalThis.crypto);
  }
  return `m_${Math.random().toString(36).slice(2, 10)}`;
};

export const pad = (value: number) => value.toString().padStart(2, '0');

export const formatDateValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const formatTimeValue = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

export const formatTranscriptTime = (date: Date) =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

export const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDateValue(date);
};

export const addMinutesToTime = (time: string, minutes: number) => {
  if (!time) return '';
  const [hours, mins] = time.split(':').map((value) => Number(value));
  if (Number.isNaN(hours) || Number.isNaN(mins)) return '';
  const base = new Date();
  base.setHours(hours, mins + minutes, 0, 0);
  return formatTimeValue(base);
};

export const generateMeetingCode = () => {
  const part = () => Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${part()}-${part()}-${part()}`;
};

export const buildMeetingLink = (code: string) => `https://meetsync.local/meet/${code}`;
export const GOOGLE_MEET_HOST = 'meet.google.com';
export const detectProvider = (link: string): MeetingProvider =>
  link.includes(GOOGLE_MEET_HOST) ? 'google' : 'meetsync';

export const formatCalendarDateTime = (date: string, time: string) => `${date}T${time}:00`;

type DownloadPdfVariant = 'default' | 'summary' | 'transcript';

type DownloadPdfOptions = {
  variant?: DownloadPdfVariant;
};

const parseTranscriptLine = (line: string) => {
  const normalized = line.trim();
  const match = normalized.match(/^(\S+)\s+([^:]+):\s*(.+)$/);
  if (!match) {
    return {
      time: '',
      speaker: 'Participant',
      text: normalized,
    };
  }

  return {
    time: match[1],
    speaker: match[2].trim() || 'Participant',
    text: match[3].trim(),
  };
};

export const downloadPdf = (
  title: string,
  meta: string[],
  lines: string[],
  fileName: string,
  options: DownloadPdfOptions = {},
) => {
  const variant = options.variant || 'default';
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  const headerHeight = variant === 'transcript' ? 86 : 74;
  const contentTop = headerHeight + 20;
  const bottomLimit = pageHeight - 56;
  let cursorY = contentTop;

  const exportedAt = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  const drawHeader = () => {
    const headerColor = variant === 'transcript' ? [1, 51, 61] : [16, 72, 84];
    doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(title, margin, 30);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Exporte le ${exportedAt}`, margin, 48);

    doc.setDrawColor(219, 227, 233);
    doc.setLineWidth(1);
    doc.line(margin, headerHeight, pageWidth - margin, headerHeight);
  };

  const drawFooter = (page: number, totalPages: number) => {
    doc.setTextColor(116, 128, 140);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const footer = `Page ${page}/${totalPages}`;
    doc.text(footer, pageWidth - margin, pageHeight - 24, { align: 'right' });
  };

  const ensureSpace = (heightNeeded: number) => {
    if (cursorY + heightNeeded <= bottomLimit) return;
    doc.addPage();
    drawHeader();
    cursorY = contentTop;
  };

  drawHeader();

  if (meta.length > 0) {
    const metaLines = meta.flatMap((line) => doc.splitTextToSize(line, maxWidth - 24));
    const cardHeight = 20 + metaLines.length * 14;
    ensureSpace(cardHeight + 12);

    doc.setFillColor(245, 248, 250);
    doc.roundedRect(margin, cursorY, maxWidth, cardHeight, 8, 8, 'F');
    doc.setDrawColor(222, 231, 237);
    doc.roundedRect(margin, cursorY, maxWidth, cardHeight, 8, 8, 'S');

    doc.setTextColor(47, 63, 75);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    let metaY = cursorY + 16;
    metaLines.forEach((line) => {
      doc.text(line, margin + 12, metaY);
      metaY += 14;
    });

    cursorY += cardHeight + 16;
  }

  if (variant === 'transcript') {
    doc.setTextColor(11, 34, 40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Transcription complete', margin, cursorY);
    cursorY += 16;

    lines.forEach((line, index) => {
      const entry = parseTranscriptLine(line);
      const speakerRow = entry.time ? `${entry.time}  ${entry.speaker}` : entry.speaker;
      const wrappedText = doc.splitTextToSize(entry.text || line, maxWidth - 32);
      const rowHeight = 28 + wrappedText.length * 14;
      ensureSpace(rowHeight + 8);

      const background = index % 2 === 0 ? [238, 245, 248] : [246, 250, 252];
      doc.setFillColor(background[0], background[1], background[2]);
      doc.roundedRect(margin, cursorY, maxWidth, rowHeight, 8, 8, 'F');

      doc.setFillColor(1, 95, 112);
      doc.rect(margin, cursorY, 4, rowHeight, 'F');

      doc.setTextColor(20, 60, 72);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text(speakerRow, margin + 12, cursorY + 16);

      doc.setTextColor(31, 41, 55);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      let lineY = cursorY + 34;
      wrappedText.forEach((textLine: string) => {
        doc.text(textLine, margin + 12, lineY);
        lineY += 14;
      });

      cursorY += rowHeight + 8;
    });
  } else {
    doc.setTextColor(39, 52, 62);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    lines.forEach((line) => {
      const wrapped = doc.splitTextToSize(line, maxWidth);
      wrapped.forEach((textLine: string) => {
        ensureSpace(16);
        doc.text(textLine, margin, cursorY);
        cursorY += 16;
      });
      cursorY += 4;
    });
  }

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    drawFooter(page, totalPages);
  }

  doc.save(fileName);
};

export const TRANSCRIPT_SNIPPETS: Array<{ speaker: string; text: string }> = [
  { speaker: 'Sarah', text: 'Nous validons la priorite sur le module calendrier.' },
  { speaker: 'Marc', text: 'Le design mobile est presque pret, il manque les etats vides.' },
  { speaker: 'Vous', text: 'Ok, on fixe une date de livraison pour jeudi.' },
  { speaker: 'Amina', text: 'Les tests QA peuvent demarrer demain matin.' },
  { speaker: 'Vous', text: 'Je propose un point rapide vendredi pour cloturer.' },
];

export const buildSummaryFromTranscript = (transcript: TranscriptEntry[]) => {
  if (transcript.length === 0) {
    return 'Aucune transcription disponible pour generer un resume.';
  }

  const speakers = Array.from(new Set(transcript.map((entry) => entry.speaker))).slice(0, 4);
  const highlights = transcript.slice(-4).map((entry) => entry.text).join(' ');

  return `Resume automatique avec ${transcript.length} interventions. Participants actifs: ${
    speakers.join(', ') || 'N/A'
  }. Points clefs: ${highlights}`;
};

export const parseParticipants = (value: string) =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

export const parseTags = (value: string) =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

export const getInitials = (value: string) => {
  const base = value.split('@')[0];
  const parts = base.split(/[\s._-]+/).filter(Boolean);
  const initials = parts.map((part) => part[0]).join('').slice(0, 2);
  return initials.toUpperCase() || '??';
};

export const formatDateLabel = (date: string) => {
  if (!date) return 'Date inconnue';
  const parsed = new Date(`${date}T00:00:00`);
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(parsed);
};

export const formatTaskTimeRange = (task: Task) => {
  const startTime = task.startTime;
  if (!startTime) return '';
  const durationMinutes = task.durationMinutes ?? 0;
  const endTime = task.endTime || addMinutesToTime(startTime, durationMinutes);
  if (!endTime) return startTime;
  return `${startTime} - ${endTime}`;
};

export const toMinutes = (value: string) => {
  const [hours, mins] = value.split(':').map((part) => Number(part));
  if (Number.isNaN(hours) || Number.isNaN(mins)) return 0;
  return hours * 60 + mins;
};

export const toDateTime = (date: string, time: string) => {
  if (!date) return null;
  const safeTime = time || '00:00';
  const value = new Date(`${date}T${safeTime}`);
  return Number.isNaN(value.getTime()) ? null : value;
};

export const getMeetingTimestamp = (meeting: Meeting) => {
  const value = toDateTime(meeting.date, meeting.time);
  return value ? value.getTime() : null;
};

// Frontend seed data removed — rely on backend API for real data.

// Frontend seed tasks removed — tasks are loaded from backend when available.

export const withAIFields = (meeting: Meeting): Meeting => ({
  ...meeting,
  transcript: meeting.transcript ?? [],
  summary: meeting.summary ?? '',
  aiStatus: meeting.aiStatus ?? 'idle',
  transcriptCursor: meeting.transcriptCursor ?? 0,
  provider: meeting.provider ?? detectProvider(meeting.link ?? ''),
  externalEventId: meeting.externalEventId ?? '',
});

export const withTaskDefaults = (task: Task): Task => {
  const rawDuration = task.durationMinutes;
  const duration = typeof rawDuration === 'number' && Number.isFinite(rawDuration) ? rawDuration : 30;
  const startTime = task.startTime || '09:00';
  return {
    ...task,
    description: task.description ?? '',
    tags: Array.isArray(task.tags) ? task.tags : [],
    priority: task.priority ?? 'medium',
    status: task.status ?? 'planned',
    durationMinutes: duration,
    startTime,
    endTime: task.endTime || addMinutesToTime(startTime, duration),
  };
};

export const loadMeetings = (): Meeting[] => {
  // No frontend seeds — the UI should call the backend via `meetingService`.
  // Return an empty array so components render an empty state when offline.
  return [];
};

export const loadTasks = (): Task[] => [];

export const emptyForm = (): Partial<MeetingFormState> => ({
  title: '',
  date: '',
  time: '',
  durationMinutes: 30,
  description: '',
  participants: [],
  useGoogleMeet: false,
  sendInvites: false,
  invitedUserIds: [],
});

export const emptyTaskForm = (): Partial<TaskFormState> => ({
  title: '',
  date: formatDateValue(new Date()),
  startTime: formatTimeValue(new Date()),
  durationMinutes: 30,
  description: '',
  priority: 'medium',
  tags: '',
});

export const statusLabels: Record<MeetingStatus, string> = {
  scheduled: 'Programme',
  live: 'En cours',
  completed: 'Termine',
  canceled: 'Annule',
};

export const statusStyles: Record<MeetingStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  live: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-gray-100 text-gray-600',
  canceled: 'bg-red-100 text-red-700',
};

export const taskStatusLabels: Record<string, string> = {
  planned: 'Planifiee',
  in_progress: 'En cours',
  done: 'Terminee',
  canceled: 'Annulee',
};

export const taskStatusStyles: Record<string, string> = {
  planned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  done: 'bg-emerald-100 text-emerald-700',
  canceled: 'bg-red-100 text-red-700',
};

export const priorityLabels: Record<TaskPriority, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
};

export const priorityStyles: Record<TaskPriority, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
};

export const aiStatusLabels: Record<AiStatus, string> = {
  idle: 'En attente',
  listening: 'Transcription',
  summarizing: 'Resume IA',
  done: 'Resume pret',
};

export const aiStatusStyles: Record<AiStatus, string> = {
  idle: 'bg-white/10 text-white/70',
  listening: 'bg-emerald-400/20 text-emerald-200',
  summarizing: 'bg-amber-400/20 text-amber-200',
  done: 'bg-blue-400/20 text-blue-200',
};

export const filterLabels: Record<MeetingFilter, string> = {
  all: 'Toutes',
  upcoming: 'A venir',
  live: 'En cours',
  past: 'Passees',
  canceled: 'Annulees',
};
