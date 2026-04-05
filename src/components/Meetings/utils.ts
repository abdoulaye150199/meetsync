import { jsPDF } from 'jspdf';

// Constants
export const STORAGE_KEY = 'meetsync.meetings.v1';
export const TASKS_STORAGE_KEY = 'meetsync.tasks.v1';
export const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/calendar.events'];
export const GOOGLE_MEET_HOST = 'meet.google.com';

// Utility functions
export const getTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

export const safeUUID = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
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

export const detectProvider = (link: string) =>
  link.includes(GOOGLE_MEET_HOST) ? 'google' : 'meetsync';

export const formatCalendarDateTime = (date: string, time: string) => `${date}T${time}:00`;

export const downloadPdf = (title: string, meta: string[], lines: string[], fileName: string) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  let cursorY = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, margin, cursorY);
  cursorY += 22;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);

  const writeLines = (content: string[]) => {
    content.forEach((line) => {
      const wrapped = doc.splitTextToSize(line, maxWidth);
      wrapped.forEach((text: string) => {
        if (cursorY > pageHeight - margin) {
          doc.addPage();
          cursorY = margin;
        }
        doc.text(text, margin, cursorY);
        cursorY += 16;
      });
    });
  };

  if (meta.length > 0) {
    writeLines(meta);
    cursorY += 10;
  }

  writeLines(lines);
  doc.save(fileName);
};