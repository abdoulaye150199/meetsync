import React, { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { io as createSocketClient, type Socket } from 'socket.io-client';
import { meetingService } from '../../services/meetingService';
import { apiService } from '../../services/api';
import type { Meeting, MeetingFormState, MeetingManagerProps } from './types';
import Modal from './Modal';
import {
  buildSummaryFromTranscript,
  downloadPdf,
  formatDateValue,
  formatTimeValue,
} from './meetingUtils';
import { FiCalendar, FiClock, FiUsers, FiPlus, FiSearch, FiPlay } from 'react-icons/fi';
import { ActiveMeetingView } from './components/ActiveMeetingView';
import useSpeechRecognition from '../../hooks/useSpeechRecognition';

interface UtilisateurResponse {
  id: string;
  nom?: string;
  email?: string;
}

type CreateMeetingPayload = MeetingFormState & { invitedUserIds?: string[] };

type FullscreenDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitCancelFullScreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
  webkitCurrentFullScreenElement?: Element | null;
  msExitFullscreen?: () => Promise<void> | void;
  msFullscreenElement?: Element | null;
};

type FullscreenElement = HTMLDivElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  webkitRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const toSocketUrl = () => {
  const fallbackOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const parsedApiUrl = new URL(API_BASE_URL, fallbackOrigin);
  const baseUrl = parsedApiUrl.href.replace(/\/api\/?$/, '/');
  const parsedBaseUrl = new URL(baseUrl);
  const protocol = parsedBaseUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${parsedBaseUrl.host}/ws/transcription`;
};

const toRealtimeSocketBaseUrl = () => {
  const envUrl = import.meta.env.VITE_CHAT_SOCKET_URL as string | undefined;
  if (envUrl) return envUrl;
  const fallbackOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const parsedApiUrl = new URL(API_BASE_URL, fallbackOrigin);
  return parsedApiUrl.href.replace(/\/api\/?$/, '');
};

const formatTranscriptTime = (rawTimestamp?: string) => {
  const date = rawTimestamp ? new Date(rawTimestamp) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Impossible de lire le flux audio.'));
    reader.onloadend = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Resultat audio invalide.'));
        return;
      }
      const base64 = reader.result.split(',')[1];
      if (!base64) {
        reject(new Error('Encodage audio invalide.'));
        return;
      }
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });

const getCurrentSpeaker = () => {
  try {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser) as { nom?: string; email?: string };
      if (parsed.nom?.trim()) return parsed.nom.trim();
      if (parsed.email?.trim()) return parsed.email.split('@')[0];
    }
  } catch {
    // ignore malformed local storage user
  }

  const storedName =
    localStorage.getItem('nom') ||
    localStorage.getItem('username') ||
    localStorage.getItem('email') ||
    'Participant';
  return storedName.split('@')[0];
};

const getFullscreenElement = () => {
  if (typeof document === 'undefined') return null;
  const fullscreenDocument = document as FullscreenDocument;
  return (
    document.fullscreenElement ||
    fullscreenDocument.webkitFullscreenElement ||
    fullscreenDocument.webkitCurrentFullScreenElement ||
    fullscreenDocument.msFullscreenElement ||
    null
  );
};

const requestElementFullscreen = async (element: HTMLDivElement) => {
  const fullscreenElement = element as FullscreenElement;

  if (element.requestFullscreen) {
    await element.requestFullscreen();
    return;
  }

  if (fullscreenElement.webkitRequestFullscreen) {
    await fullscreenElement.webkitRequestFullscreen();
    return;
  }

  if (fullscreenElement.webkitRequestFullScreen) {
    await fullscreenElement.webkitRequestFullScreen();
    return;
  }

  if (fullscreenElement.msRequestFullscreen) {
    await fullscreenElement.msRequestFullscreen();
    return;
  }

  throw new Error("Le plein écran n'est pas supporté sur cet appareil.");
};

const exitFullscreenMode = async () => {
  if (typeof document === 'undefined') return;
  const fullscreenDocument = document as FullscreenDocument;

  if (document.exitFullscreen) {
    await document.exitFullscreen();
    return;
  }

  if (fullscreenDocument.webkitExitFullscreen) {
    await fullscreenDocument.webkitExitFullscreen();
    return;
  }

  if (fullscreenDocument.webkitCancelFullScreen) {
    await fullscreenDocument.webkitCancelFullScreen();
    return;
  }

  if (fullscreenDocument.msExitFullscreen) {
    await fullscreenDocument.msExitFullscreen();
    return;
  }
};

const MeetingManager: React.FC<MeetingManagerProps> = ({ onCallStarted }) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formState, setFormState] = useState<Partial<MeetingFormState>>({
    title: '',
    date: formatDateValue(new Date()),
    time: formatTimeValue(new Date()),
    duration: 30,
    participants: [],
    invitedUserIds: [],
  });
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; nom?: string; email?: string }>>([]);
  const [, setToast] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false);
  const [speechRecognitionEnabled, setSpeechRecognitionEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [microphoneStream, setMicrophoneStream] = useState<MediaStream | null>(null);
  const transcriptionSocketRef = useRef<WebSocket | null>(null);
  const transcriptionRecorderRef = useRef<MediaRecorder | null>(null);
  const transcriptionMeetingIdRef = useRef<string | null>(null);
  const liveMeetingSocketRef = useRef<Socket | null>(null);
  const remoteTranscriptResetTimerRef = useRef<number | null>(null);
  const activeMeetingViewRef = useRef<HTMLDivElement | null>(null);
  const [remoteLiveTranscriptionMeetingId, setRemoteLiveTranscriptionMeetingId] = useState<string | null>(null);
  const [remoteLiveTranscriptionSpeaker, setRemoteLiveTranscriptionSpeaker] = useState<string | null>(null);
  const activeMeetingIdRef = useRef<string | null>(null);

  const activeMeeting = activeMeetingId
    ? meetings.find((meeting) => meeting.id === activeMeetingId) || null
    : null;

  useEffect(() => {
    fetchMeetings();
  }, []);

  useEffect(() => {
    if (!activeMeetingId) return;
    if (!meetings.some((meeting) => meeting.id === activeMeetingId)) {
      setActiveMeetingId(null);
    }
  }, [activeMeetingId, meetings]);

  useEffect(() => {
    activeMeetingIdRef.current = activeMeetingId;
  }, [activeMeetingId]);

  useEffect(() => {
    return () => {
      if (remoteTranscriptResetTimerRef.current) {
        window.clearTimeout(remoteTranscriptResetTimerRef.current);
        remoteTranscriptResetTimerRef.current = null;
      }
      setRemoteLiveTranscriptionSpeaker(null);
    };
  }, []);

  const stopMediaStream = (stream: MediaStream | null) => {
    if (!stream) return;
    stream.getTracks().forEach((track) => track.stop());
  };

  const setMeetingAiStatus = (meetingId: string, status: Meeting['aiStatus']) => {
    setMeetings((prev) =>
      prev.map((meeting) => (meeting.id === meetingId ? { ...meeting, aiStatus: status } : meeting))
    );
  };

  const stopTranscription = ({
    meetingId,
    updateMeetingState = true,
    showToast = false,
    nextAiStatus,
  }: {
    meetingId?: string | null;
    updateMeetingState?: boolean;
    showToast?: boolean;
    nextAiStatus?: Meeting['aiStatus'];
  } = {}) => {
    const targetedMeetingId = meetingId ?? transcriptionMeetingIdRef.current;

    const recorder = transcriptionRecorderRef.current;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onerror = null;
      recorder.onstop = null;
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
      transcriptionRecorderRef.current = null;
    }

    const socket = transcriptionSocketRef.current;
    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
      transcriptionSocketRef.current = null;
    }

    transcriptionMeetingIdRef.current = null;

    if (updateMeetingState && targetedMeetingId) {
      const keepListeningWithBrowserStt =
        speechRecognitionEnabled && activeMeetingIdRef.current === targetedMeetingId;
      setMeetingAiStatus(
        targetedMeetingId,
        nextAiStatus ?? (keepListeningWithBrowserStt ? 'listening' : 'idle'),
      );
    }

    if (showToast) {
      setToast('Transcription arrêtée');
    }
  };

  const activateBrowserSpeechFallback = (meetingId: string, message?: string) => {
    setSpeechRecognitionEnabled(true);
    stopTranscription({
      meetingId,
      updateMeetingState: true,
      nextAiStatus: 'listening',
    });

    const normalizedMessage = (message || '').trim();
    const suffix = 'Speech-to-Text navigateur activé.';

    if (!normalizedMessage) {
      setToast(`Transcription IA indisponible. ${suffix}`);
      return;
    }

    setToast(
      /[.!?]$/.test(normalizedMessage)
        ? `${normalizedMessage} ${suffix}`
        : `${normalizedMessage}. ${suffix}`,
    );
  };

  const stopTranscriptionOnUnmount = useEffectEvent(() => {
    stopTranscription({ updateMeetingState: false });
  });

  const appendTranscriptEntry = useCallback(({
    meetingId,
    speaker,
    text,
    timestamp,
  }: {
    meetingId: string;
    speaker: string;
    text: string;
    timestamp?: string;
  }) => {
    const normalizedText = text.trim();
    if (!normalizedText) return;

    const formattedTime = formatTranscriptTime(timestamp);
    const generatedId = `${meetingId}-${timestamp || Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    setMeetings((prev) =>
      prev.map((meeting) => {
        if (meeting.id !== meetingId) return meeting;

        const duplicated = meeting.transcript.some(
          (entry) =>
            entry.speaker === speaker &&
            entry.text === normalizedText &&
            entry.time === formattedTime
        );

        if (duplicated) {
          return meeting;
        }

        const nextTranscript = [
          ...meeting.transcript,
          { id: generatedId, speaker, text: normalizedText, time: formattedTime },
        ];

        return {
          ...meeting,
          aiStatus: 'listening',
          transcript: nextTranscript,
          transcriptCursor: nextTranscript.length,
        };
      })
    );
  }, []);

  const handleSpeechTranscript = useCallback((text: string, isFinal: boolean) => {
    if (!isFinal) return;
    const meetingId = activeMeetingIdRef.current;
    if (!meetingId) return;

    appendTranscriptEntry({
      meetingId,
      speaker: getCurrentSpeaker(),
      text,
      timestamp: new Date().toISOString(),
    });
  }, [appendTranscriptEntry]);

  useEffect(() => {
    if (!activeMeetingId) {
      if (liveMeetingSocketRef.current) {
        liveMeetingSocketRef.current.disconnect();
        liveMeetingSocketRef.current = null;
      }
      return;
    }

    if (liveMeetingSocketRef.current) {
      liveMeetingSocketRef.current.disconnect();
      liveMeetingSocketRef.current = null;
    }

    const socket = createSocketClient(toRealtimeSocketBaseUrl(), {
      path: '/socket.io',
      transports: ['websocket'],
      upgrade: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    liveMeetingSocketRef.current = socket;

    socket.on('connect', () => {
      const meetingId = activeMeetingIdRef.current;
      if (!meetingId) return;
      socket.emit('rejoindre-reunion', meetingId);
    });

    socket.on('nouveau-segment', (payload: {
      idReunion?: string;
      texte?: string;
      locuteur?: string;
      timestamp?: string;
    }) => {
      const meetingId = payload.idReunion;
      const text = payload.texte;
      if (!meetingId || !text) return;

      setRemoteLiveTranscriptionMeetingId(meetingId);
      setRemoteLiveTranscriptionSpeaker((payload.locuteur || '').trim() || 'Participant');
      if (remoteTranscriptResetTimerRef.current) {
        window.clearTimeout(remoteTranscriptResetTimerRef.current);
      }
      remoteTranscriptResetTimerRef.current = window.setTimeout(() => {
        setRemoteLiveTranscriptionMeetingId((current) => (current === meetingId ? null : current));
        setRemoteLiveTranscriptionSpeaker(null);
      }, 12000);

      appendTranscriptEntry({
        meetingId,
        speaker: payload.locuteur || 'Participant',
        text,
        timestamp: payload.timestamp,
      });
    });

    return () => {
      socket.disconnect();
      if (liveMeetingSocketRef.current === socket) {
        liveMeetingSocketRef.current = null;
      }
    };
  }, [activeMeetingId, appendTranscriptEntry]);

  const {
    isListening: browserSpeechListening,
    isSupported: browserSpeechSupported,
    error: browserSpeechError,
  } = useSpeechRecognition({
    enabled: speechRecognitionEnabled,
    onTranscript: handleSpeechTranscript,
  });

  useEffect(() => {
    setIsListening(browserSpeechListening);
  }, [browserSpeechListening]);

  useEffect(() => {
    if (!browserSpeechError) return;
    setToast(browserSpeechError);
  }, [browserSpeechError]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const syncFullscreenState = () => {
      const fullscreenElement = getFullscreenElement();
      setIsFullscreen(Boolean(fullscreenElement && fullscreenElement === activeMeetingViewRef.current));
    };

    syncFullscreenState();

    document.addEventListener('fullscreenchange', syncFullscreenState);
    document.addEventListener('webkitfullscreenchange', syncFullscreenState);
    document.addEventListener('msfullscreenchange', syncFullscreenState);

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenState);
      document.removeEventListener('webkitfullscreenchange', syncFullscreenState);
      document.removeEventListener('msfullscreenchange', syncFullscreenState);
    };
  }, []);

  const ensureMicrophoneReady = async () => {
    if (microphoneStream && microphoneStream.getAudioTracks().some((track) => track.readyState === 'live')) {
      return microphoneStream;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setToast("Le micro n'est pas disponible sur ce navigateur");
      return null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setMicrophoneStream(stream);
      setMicrophoneEnabled(true);
      return stream;
    } catch {
      setMicrophoneEnabled(false);
      setToast("Autorisation micro refusée");
      return null;
    }
  };

  const startTranscription = async (meetingId: string) => {
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
      setToast('WebSocket non supporté sur ce navigateur');
      return;
    }
    if (typeof window.MediaRecorder === 'undefined') {
      setToast("L'enregistrement audio n'est pas supporté sur ce navigateur");
      return;
    }

    const microphone = await ensureMicrophoneReady();
    if (!microphone) return;

    const existingSocket = transcriptionSocketRef.current;
    if (
      transcriptionMeetingIdRef.current === meetingId &&
      existingSocket &&
      (existingSocket.readyState === WebSocket.OPEN || existingSocket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    if (transcriptionMeetingIdRef.current && transcriptionMeetingIdRef.current !== meetingId) {
      stopTranscription({ updateMeetingState: true });
    }

    const socketUrl = toSocketUrl();
    const socket = new WebSocket(socketUrl);

    transcriptionSocketRef.current = socket;
    transcriptionMeetingIdRef.current = meetingId;
    setMeetingAiStatus(meetingId, 'listening');

    socket.onopen = () => {
      const candidateMimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/mp4',
      ];
      const selectedMimeType = candidateMimeTypes.find((type) => {
        if (typeof window.MediaRecorder.isTypeSupported !== 'function') return false;
        return window.MediaRecorder.isTypeSupported(type);
      });

      const recorder = selectedMimeType
        ? new MediaRecorder(microphone, { mimeType: selectedMimeType })
        : new MediaRecorder(microphone);
      transcriptionRecorderRef.current = recorder;

      recorder.ondataavailable = async (event: BlobEvent) => {
        if (!event.data || event.data.size === 0) return;
        const currentSocket = transcriptionSocketRef.current;
        if (!currentSocket || currentSocket.readyState !== WebSocket.OPEN) return;
        if (transcriptionMeetingIdRef.current !== meetingId) return;

        try {
          const audioBase64 = await blobToBase64(event.data);
          currentSocket.send(
            JSON.stringify({
              type: 'audio',
              meetingId,
              speaker: getCurrentSpeaker(),
              audioBase64,
              // Firefox can send chunks with an empty event.data.type.
              // recorder.mimeType gives a more reliable format hint for the backend.
              mimeType:
                event.data.type ||
                recorder.mimeType ||
                selectedMimeType ||
                undefined,
            })
          );
        } catch {
          setToast('Erreur envoi audio transcription');
        }
      };

      recorder.onerror = () => {
        setToast("Erreur d'enregistrement audio");
      };

      recorder.start(2000);
      setToast('Transcription démarrée');
    };

    socket.onmessage = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as {
          type?: string;
          meetingId?: string;
          speaker?: string;
          text?: string;
          timestamp?: string;
          message?: string;
        };

        if (payload.type === 'error') {
          if (browserSpeechSupported) {
            activateBrowserSpeechFallback(meetingId, payload.message);
          } else {
            stopTranscription({ meetingId, updateMeetingState: true });
            setToast(payload.message || 'Erreur de transcription');
          }
          return;
        }

        if (payload.type === 'transcription' && payload.meetingId === meetingId && payload.text) {
          appendTranscriptEntry({
            meetingId,
            speaker: payload.speaker || 'Participant',
            text: payload.text,
            timestamp: payload.timestamp,
          });
        }
      } catch {
        // ignore malformed WS payload
      }
    };

    socket.onerror = () => {
      if (browserSpeechSupported) {
        activateBrowserSpeechFallback(
          meetingId,
          'Connexion à la transcription IA interrompue',
        );
        return;
      }

      stopTranscription({ meetingId, updateMeetingState: true });
      setToast('Connexion transcription interrompue');
    };

    socket.onclose = () => {
      if (transcriptionMeetingIdRef.current === meetingId) {
        stopTranscription({ meetingId, updateMeetingState: true });
      }
    };
  };

  const resetMeetingMedia = (meetingId?: string | null) => {
    stopTranscription({ meetingId, updateMeetingState: true });
    setRemoteLiveTranscriptionMeetingId(null);
    setRemoteLiveTranscriptionSpeaker(null);
    if (remoteTranscriptResetTimerRef.current) {
      window.clearTimeout(remoteTranscriptResetTimerRef.current);
      remoteTranscriptResetTimerRef.current = null;
    }
    stopMediaStream(screenStream);
    stopMediaStream(cameraStream);
    stopMediaStream(microphoneStream);
    setScreenStream(null);
    setCameraStream(null);
    setMicrophoneStream(null);
    setMicrophoneEnabled(false);
    setSpeechRecognitionEnabled(false);
    setIsListening(false);
    setIsFullscreen(false);
    setScreenError(null);
  };

  useEffect(() => {
    return () => {
      stopMediaStream(screenStream);
      stopMediaStream(cameraStream);
      stopMediaStream(microphoneStream);
    };
  }, [cameraStream, microphoneStream, screenStream]);

  useEffect(() => {
    return () => {
      stopTranscriptionOnUnmount();
    };
  }, []);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const data = await meetingService.getAll();
      setMeetings(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message || 'Erreur chargement reunions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!showForm) return;
    (async () => {
      try {
        const resp = await apiService.get('/utilisateurs');
        if (!resp.error && Array.isArray(resp.data)) {
          setAvailableUsers((resp.data as UtilisateurResponse[]).map((u) => ({ id: u.id, nom: u.nom || u.email, email: u.email })));
        }
      } catch {
        // ignore
      }
    })();
  }, [showForm]);

  const openCreateForm = (preset?: Partial<MeetingFormState>) => {
    setFormState({
      title: preset?.title || '',
      date: preset?.date || formatDateValue(new Date()),
      time: preset?.time || formatTimeValue(new Date()),
      duration: preset?.duration ?? 30,
      participants: preset?.participants || [],
      invitedUserIds: preset?.invitedUserIds || [],
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!formState.title || !formState.date || !formState.time) {
      setToast('Titre, date et heure sont obligatoires.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: CreateMeetingPayload = {
        title: (formState.title || '').trim(),
        description: (formState.description || '').trim(),
        date: formState.date,
        time: formState.time,
        duration: formState.duration || 30,
        participants: formState.participants || [],
        roomId: '',
        isRecurring: false,
        recurrencePattern: 'weekly',
        sendInvites: false,
        invitedUserIds: formState.invitedUserIds || [],
      };
      const created = await meetingService.create(payload);
      setMeetings((prev) => [created, ...prev]);
      setShowForm(false);
      setToast('Réunion créée.');
    } catch (err) {
      setToast((err as Error).message || 'Erreur création');
    } finally {
      setIsSaving(false);
    }
  };

  const startMeeting = async (id: string) => {
    try {
      const updated = await meetingService.start(id);
      setMeetings((prev) => prev.map((m) => (m.id === id ? updated : m)));
      setActiveMeetingId(id);
      onCallStarted?.();
      setToast('Réunion démarrée');
    } catch (err) {
      setToast((err as Error).message || 'Erreur démarrage');
    }
  };

  const joinMeeting = async (id: string) => {
    try {
      await meetingService.join(id);
      setActiveMeetingId(id);
      onCallStarted?.();
      setToast('Réunion rejointe');
    } catch (err) {
      setToast((err as Error).message || 'Erreur rejoindre');
    }
  };

  const toggleTranscription = async (id: string) => {
    const isCurrentMeetingActive = transcriptionMeetingIdRef.current === id;
    const isRecording = transcriptionRecorderRef.current?.state === 'recording';
    const isRemoteActive = remoteLiveTranscriptionMeetingId === id && !isCurrentMeetingActive;

    if (isCurrentMeetingActive && isRecording) {
      stopTranscription({ meetingId: id, updateMeetingState: true, showToast: true });
      return;
    }

    if (isRemoteActive) {
      setToast('Transcription déjà active par un autre participant');
      return;
    }

    await startTranscription(id);
  };

  const generateSummary = (id: string) => {
    setMeetings((prev) =>
      prev.map((meeting) =>
        meeting.id === id ? { ...meeting, aiStatus: 'summarizing' } : meeting
      )
    );

    window.setTimeout(() => {
      setMeetings((prev) =>
        prev.map((meeting) => {
          if (meeting.id !== id) return meeting;

          const generatedSummary = buildSummaryFromTranscript(meeting.transcript || []);
          return {
            ...meeting,
            aiStatus: 'done',
            summary: generatedSummary,
          };
        })
      );
      setToast('Résumé généré');
    }, 500);
  };

  const getMeetingById = (id: string) => meetings.find((meeting) => meeting.id === id) || null;

  const sanitizeFileName = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();

  const loadTranscriptEntries = async (meeting: Meeting) => {
    if (meeting.transcript.length > 0) {
      return meeting.transcript;
    }

    try {
      const transcriptResponse = await meetingService.getTranscript(meeting.id) as {
        segments?: Array<{
          speaker?: string;
          text?: string;
          timestamp?: string;
        }>;
      };
      const segments = Array.isArray(transcriptResponse?.segments) ? transcriptResponse.segments : [];
      if (segments.length === 0) {
        return meeting.transcript;
      }

      const normalizedEntries = segments
        .filter((segment) => Boolean(segment.text))
        .map((segment, index) => {
          const date = segment.timestamp ? new Date(segment.timestamp) : new Date();
          const time = Number.isNaN(date.getTime())
            ? '00:00'
            : date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          return {
            id: `${meeting.id}-segment-${index}`,
            speaker: segment.speaker || 'Participant',
            text: segment.text || '',
            time,
          };
        });

      if (normalizedEntries.length > 0) {
        setMeetings((prev) =>
          prev.map((currentMeeting) =>
            currentMeeting.id === meeting.id
              ? { ...currentMeeting, transcript: normalizedEntries, transcriptCursor: normalizedEntries.length }
              : currentMeeting
          )
        );
      }

      return normalizedEntries;
    } catch {
      return meeting.transcript;
    }
  };

  const downloadSummaryPdf = async (meeting: Meeting) => {
    const currentMeeting = getMeetingById(meeting.id) || meeting;
    const transcriptEntries = await loadTranscriptEntries(currentMeeting);
    const summaryText =
      currentMeeting.summary?.trim() ||
      buildSummaryFromTranscript(transcriptEntries);

    const lines = summaryText
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setToast('Aucun résumé à exporter');
      return;
    }

    const safeTitle = sanitizeFileName(currentMeeting.title || 'reunion');
    downloadPdf(
      `Resume - ${currentMeeting.title}`,
      [
        `Date: ${currentMeeting.date} ${currentMeeting.time}`,
        `Reunion: ${currentMeeting.meetingCode}`,
      ],
      lines,
      `${safeTitle || 'reunion'}-resume.pdf`,
      { variant: 'summary' }
    );
    setToast('Résumé PDF téléchargé');
  };

  const downloadTranscriptPdf = async (meeting: Meeting) => {
    const currentMeeting = getMeetingById(meeting.id) || meeting;
    const transcriptEntries = await loadTranscriptEntries(currentMeeting);

    if (transcriptEntries.length === 0) {
      setToast('Aucune transcription à exporter');
      return;
    }

    const transcriptLines = transcriptEntries.map(
      (entry) => `${entry.time} ${entry.speaker}: ${entry.text}`
    );

    const safeTitle = sanitizeFileName(currentMeeting.title || 'reunion');
    downloadPdf(
      `Transcription - ${currentMeeting.title}`,
      [
        `Date: ${currentMeeting.date} ${currentMeeting.time}`,
        `Reunion: ${currentMeeting.meetingCode}`,
      ],
      transcriptLines,
      `${safeTitle || 'reunion'}-transcription.pdf`,
      { variant: 'transcript' }
    );
    setToast('Transcription PDF téléchargée');
  };

  const clearAiData = (id: string) => {
    if (transcriptionMeetingIdRef.current === id) {
      stopTranscription({ meetingId: id, updateMeetingState: true });
    }
    setMeetings((prev) =>
      prev.map((meeting) =>
        meeting.id === id
          ? { ...meeting, aiStatus: 'idle', transcript: [], summary: '', transcriptCursor: 0 }
          : meeting
      )
    );
  };

  const handleEndMeeting = async (id: string) => {
    try {
      const updated = await meetingService.end(id);
      setMeetings((prev) => prev.map((meeting) => (meeting.id === id ? updated : meeting)));
      resetMeetingMedia(id);
      setActiveMeetingId(null);
      setToast('Réunion terminée');
    } catch (err) {
      setToast((err as Error).message || 'Erreur fin de réunion');
    }
  };

  const openMeetingLink = (meeting: Meeting) => {
    const link = meeting.googleMeetUrl || meeting.link;
    if (!link) {
      setToast('Aucun lien de réunion disponible.');
      return;
    }
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setToast('Copié dans le presse-papiers');
    } catch {
      setToast('Impossible de copier');
    }
  };

  const toggleFullscreen = async () => {
    const meetingView = activeMeetingViewRef.current;

    if (!meetingView) {
      setToast("La vue réunion n'est pas disponible pour le plein écran");
      return;
    }

    try {
      const fullscreenElement = getFullscreenElement();
      if (fullscreenElement === meetingView) {
        await exitFullscreenMode();
        return;
      }

      if (fullscreenElement) {
        await exitFullscreenMode();
      }

      await requestElementFullscreen(meetingView);
    } catch (error) {
      setToast(
        error instanceof Error
          ? error.message
          : "Impossible d'activer le plein écran"
      );
    }
  };

  if (activeMeeting) {
    const isLocalTranscriptionActive =
      transcriptionMeetingIdRef.current === activeMeeting.id &&
      transcriptionRecorderRef.current?.state === 'recording';
    const isRemoteTranscriptionActive =
      remoteLiveTranscriptionMeetingId === activeMeeting.id && !isLocalTranscriptionActive;
    const transcriptionActorLabel =
      activeMeeting.aiStatus === 'listening'
        ? isLocalTranscriptionActive
          ? 'vous'
          : isRemoteTranscriptionActive
            ? (remoteLiveTranscriptionSpeaker || 'un participant')
            : null
        : null;

    return (
      <div className="flex-1 flex flex-col min-h-0">
        <ActiveMeetingView
          ref={activeMeetingViewRef}
          activeMeeting={activeMeeting}
          screenStream={screenStream}
          cameraStream={cameraStream}
          screenError={screenError}
          microphoneEnabled={microphoneEnabled}
          speechRecognitionEnabled={speechRecognitionEnabled}
          isListening={isListening}
          isFullscreen={isFullscreen}
          isLocalTranscriptionActive={Boolean(isLocalTranscriptionActive)}
          isRemoteTranscriptionActive={isRemoteTranscriptionActive}
          transcriptionActorLabel={transcriptionActorLabel}
          onToggleTranscription={(id) => {
            void toggleTranscription(id);
          }}
          onToggleSpeechRecognition={() => {
            if (!activeMeeting) return;
            if (!browserSpeechSupported) {
              const isCurrentMeetingActive = transcriptionMeetingIdRef.current === activeMeeting.id;
              const isRecording = transcriptionRecorderRef.current?.state === 'recording';

              if (isCurrentMeetingActive && isRecording) {
                stopTranscription({
                  meetingId: activeMeeting.id,
                  updateMeetingState: true,
                  showToast: true,
                });
                return;
              }

              void startTranscription(activeMeeting.id);
              setToast('Speech-to-Text navigateur indisponible, transcription IA activée');
              return;
            }
            setSpeechRecognitionEnabled((prev) => {
              const next = !prev;
              if (next) {
                setMeetingAiStatus(activeMeeting.id, 'listening');
              } else if (transcriptionMeetingIdRef.current !== activeMeeting.id) {
                setMeetingAiStatus(activeMeeting.id, 'idle');
              }
              return next;
            });
          }}
          onGenerateSummary={generateSummary}
          onClearAiData={clearAiData}
          onDownloadSummaryPdf={(meeting) => {
            void downloadSummaryPdf(meeting);
          }}
          onDownloadTranscriptPdf={(meeting) => {
            void downloadTranscriptPdf(meeting);
          }}
          onToggleMicrophone={async () => {
            if (!navigator.mediaDevices?.getUserMedia) {
              setToast("Le micro n'est pas disponible sur ce navigateur");
              return;
            }

            if (microphoneStream) {
              if (transcriptionMeetingIdRef.current) {
                stopTranscription({ meetingId: transcriptionMeetingIdRef.current, updateMeetingState: true });
              }
              setSpeechRecognitionEnabled(false);
              stopMediaStream(microphoneStream);
              setMicrophoneStream(null);
              setMicrophoneEnabled(false);
              setToast('Microphone désactivé');
              return;
            }

            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
              setMicrophoneStream(stream);
              setMicrophoneEnabled(true);
              setToast('Microphone activé');
            } catch {
              setMicrophoneEnabled(false);
              setToast("Autorisation micro refusée");
            }
          }}
          onToggleCamera={async () => {
            if (!navigator.mediaDevices?.getUserMedia) {
              setToast("La caméra n'est pas disponible sur ce navigateur");
              return;
            }

            if (cameraStream) {
              stopMediaStream(cameraStream);
              setCameraStream(null);
              setToast('Caméra désactivée');
              return;
            }

            try {
              const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
              setCameraStream(stream);
              setToast('Caméra activée');
            } catch {
              setToast("Autorisation caméra refusée");
            }
          }}
          onStopScreenShare={() => {
            stopMediaStream(screenStream);
            setScreenStream(null);
            setScreenError(null);
            setToast('Partage d’écran arrêté');
          }}
          onStartScreenShare={async () => {
            const mediaDevices = navigator.mediaDevices as MediaDevices & {
              getDisplayMedia?: (constraints?: MediaStreamConstraints) => Promise<MediaStream>;
            };
            if (!mediaDevices?.getDisplayMedia) {
              setScreenError("Partage d'écran indisponible");
              return;
            }

            try {
              const stream = await mediaDevices.getDisplayMedia({ video: true, audio: false });
              const videoTrack = stream.getVideoTracks()[0];
              if (videoTrack) {
                videoTrack.addEventListener('ended', () => {
                  setScreenStream(null);
                  setToast("Partage d'écran terminé");
                });
              }
              setScreenStream(stream);
              setScreenError(null);
              setToast("Partage d'écran activé");
            } catch {
              setScreenError("Autorisation partage d'écran refusée");
            }
          }}
          onEndMeeting={handleEndMeeting}
          onToggleFullscreen={() => {
            void toggleFullscreen();
          }}
          onOpenMeetingLink={openMeetingLink}
          onCopyToClipboard={copyToClipboard}
          onReturnToMeetings={() => {
            resetMeetingMedia(activeMeeting.id);
            setActiveMeetingId(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-6 min-h-0">
      <div className="rounded-2xl bg-gradient-to-br from-[#01333D] to-[#004a5f] text-white p-6 flex items-center justify-between">
        <div>
          <p className="text-white/70 text-sm">Gestion des reunions</p>
          <h2 className="text-2xl font-bold">Tableau de bord</h2>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => openCreateForm()} className="px-4 py-2 rounded-lg border border-white/40 text-white text-sm font-semibold hover:bg-white/10 transition flex items-center gap-2">
            <FiPlus /> Programmer
          </button>
          <button onClick={() => fetchMeetings()} className="px-4 py-2 rounded-lg border border-white/20 text-white text-sm font-semibold hover:bg-white/10 transition flex items-center gap-2">
            <FiSearch /> Rafraichir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border rounded-2xl p-4">
          <h3 className="text-lg font-semibold mb-3">Vos reunions</h3>
          {loading && <div className="text-sm text-gray-500">Chargement...</div>}
          {error && <div className="text-sm text-red-500">{error}</div>}
          <div className="space-y-3">
            {meetings.map((meeting) => (
              <div key={meeting.id} className="border rounded-2xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{meeting.title}</div>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-3">
                    <span className="flex items-center gap-1"><FiCalendar /> {meeting.date}</span>
                    <span className="flex items-center gap-1"><FiClock /> {meeting.time}</span>
                    <span className="flex items-center gap-1"><FiUsers /> {meeting.participants?.length || 0}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {meeting.status === 'scheduled' && (
                    <button onClick={() => startMeeting(meeting.id)} className="px-3 py-1 rounded-lg bg-[#01333D] text-white text-xs font-semibold"> <FiPlay /> Demarrer</button>
                  )}
                  <button onClick={() => joinMeeting(meeting.id)} className="px-3 py-1 rounded-lg border border-gray-200 text-gray-700 text-xs">Rejoindre</button>
                </div>
              </div>
            ))}
            {meetings.length === 0 && !loading && <div className="text-sm text-gray-500">Aucune reunion.</div>}
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-4">
          <h3 className="text-lg font-semibold mb-3">Details rapides</h3>
          <p className="text-sm text-gray-500">Sélectionnez une réunion dans la colonne de gauche pour voir plus d'options (fonctionnalité simplifiée dans cette version).</p>
        </div>
      </div>

      {showForm && (
        <Modal title="Programmer une reunion" onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Titre</label>
              <input type="text" value={formState.title || ''} onChange={(e) => setFormState((p) => ({ ...p, title: e.target.value }))} className="w-full border px-3 py-2 rounded" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={formState.date || ''} onChange={(e) => setFormState((p) => ({ ...p, date: e.target.value }))} className="border px-3 py-2 rounded" />
              <input type="time" value={formState.time || ''} onChange={(e) => setFormState((p) => ({ ...p, time: e.target.value }))} className="border px-3 py-2 rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duree (minutes)</label>
              <input type="number" min={15} value={String(formState.duration || 30)} onChange={(e) => setFormState((p) => ({ ...p, duration: Number(e.target.value) }))} className="w-32 border px-3 py-2 rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Participants (emails, séparés par des virgules)</label>
              <input
                type="text"
                value={Array.isArray(formState.participants) ? (formState.participants as string[]).join(', ') : ''}
                onChange={(e) => setFormState((p) => ({ ...p, participants: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))}
                className="w-full border px-3 py-2 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Inviter des utilisateurs</label>
              <div className="max-h-40 overflow-auto border rounded p-2">
                {availableUsers.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 mb-1">
                    <input type="checkbox" checked={(formState.invitedUserIds || []).includes(u.id)} onChange={(e) => {
                      const set = new Set(formState.invitedUserIds || []);
                      if (e.target.checked) set.add(u.id); else set.delete(u.id);
                      setFormState((p) => ({ ...p, invitedUserIds: Array.from(set) }));
                    }} />
                    <span className="text-sm">{u.nom} <span className="text-xs text-gray-400">{u.email}</span></span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded">Annuler</button>
              <button onClick={handleSave} className="px-4 py-2 bg-[#01333D] text-white rounded" disabled={isSaving}>{isSaving ? 'Enregistrement...' : 'Programmer'}</button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default MeetingManager;
