const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const CALENDAR_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

let scriptPromise: Promise<void> | null = null;

const loadGoogleScript = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Identity non disponible.'));
  }

  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Impossible de charger Google Identity.'));
    document.head.appendChild(script);
  });

  return scriptPromise;
};

export interface MeetEventInput {
  summary: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  timeZone: string;
  attendees?: string[];
  sendUpdates?: 'none' | 'all';
}

export interface MeetEventResult {
  eventId: string;
  meetLink: string;
}

export const requestGoogleAccessToken = async (
  clientId: string,
  scopes: string[],
  prompt: 'consent' | '' = 'consent',
) => {
  await loadGoogleScript();

  return new Promise<GoogleTokenResponse>((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity non disponible.'));
      return;
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: scopes.join(' '),
      callback: (response: GoogleTokenResponse) => {
        if (!response || response.error) {
          reject(new Error(response?.error_description || response?.error || 'Echec OAuth'));
          return;
        }
        resolve(response);
      },
    });

    tokenClient.requestAccessToken({ prompt });
  });
};

const extractMeetLink = (payload: Record<string, unknown>): string => {
  if (typeof payload.hangoutLink === 'string') {
    return payload.hangoutLink;
  }

  const conferenceData = payload.conferenceData as
    | { entryPoints?: Array<{ entryPointType?: string; uri?: string }> }
    | undefined;

  const entry = conferenceData?.entryPoints?.find(
    (item) => item.entryPointType === 'video' && typeof item.uri === 'string',
  );

  return entry?.uri ?? '';
};

export const createGoogleMeetEvent = async (
  accessToken: string,
  input: MeetEventInput,
) => {
  const url = new URL(CALENDAR_EVENTS_URL);
  url.searchParams.set('conferenceDataVersion', '1');
  if (input.sendUpdates === 'all') {
    url.searchParams.set('sendUpdates', 'all');
  }

  const body = {
    summary: input.summary,
    description: input.description,
    start: {
      dateTime: input.startDateTime,
      timeZone: input.timeZone,
    },
    end: {
      dateTime: input.endDateTime,
      timeZone: input.timeZone,
    },
    attendees: input.attendees?.map((email) => ({ email })),
    conferenceData: {
      createRequest: {
        requestId: `meetsync-${Date.now()}`,
        conferenceSolutionKey: {
          type: 'hangoutsMeet',
        },
      },
    },
  };

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const message =
      (data.error as { message?: string } | undefined)?.message ||
      'Erreur lors de la creation du lien Google Meet.';
    throw new Error(message);
  }

  const meetLink = extractMeetLink(data);
  if (!meetLink) {
    throw new Error('Lien Google Meet indisponible.');
  }

  return {
    eventId: String(data.id ?? ''),
    meetLink,
  } satisfies MeetEventResult;
};
