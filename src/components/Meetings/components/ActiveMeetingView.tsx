import { forwardRef, useEffect, useRef } from 'react';
import {
  FiUsers,
  FiCopy,
  FiVideo,
  FiVideoOff,
  FiMic,
  FiMicOff,
  FiVolume2,
  FiFileText,
  FiDownload,
  FiMonitor,
  FiMessageSquare,
  FiPhoneOff,
  FiMaximize,
  FiMinimize,
} from 'react-icons/fi';
import type { Meeting, AiStatus } from '../types';

interface ActiveMeetingViewProps {
  activeMeeting: Meeting;
  screenStream: MediaStream | null;
  cameraStream: MediaStream | null;
  screenError: string | null;
  microphoneEnabled: boolean;
  speechRecognitionEnabled: boolean;
  isListening: boolean;
  isFullscreen: boolean;
  isLocalTranscriptionActive: boolean;
  isRemoteTranscriptionActive: boolean;
  transcriptionActorLabel?: string | null;
  onToggleTranscription: (id: string) => void;
  onToggleSpeechRecognition: () => void;
  onGenerateSummary: (id: string) => void;
  onClearAiData: (id: string) => void;
  onDownloadSummaryPdf: (meeting: Meeting) => void;
  onDownloadTranscriptPdf: (meeting: Meeting) => void;
  onToggleMicrophone: () => void;
  onToggleCamera: () => void;
  onStopScreenShare: () => void;
  onStartScreenShare: () => void;
  onEndMeeting: (id: string) => void;
  onToggleFullscreen: () => void;
  onOpenMeetingLink: (meeting: Meeting) => void;
  onCopyToClipboard: (value: string) => void;
  onReturnToMeetings: () => void;
}

const aiStatusLabels: Record<AiStatus, string> = {
  idle: 'En attente',
  listening: 'Transcription',
  summarizing: 'Resume IA',
  done: 'Resume pret',
};

const aiStatusStyles: Record<AiStatus, string> = {
  idle: 'bg-white/10 text-white/70',
  listening: 'bg-emerald-400/20 text-emerald-200',
  summarizing: 'bg-amber-400/20 text-amber-200',
  done: 'bg-blue-400/20 text-blue-200',
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
};

const formatDateLabel = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return "Aujourd'hui";
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'Demain';
  }

  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
};

export const ActiveMeetingView = forwardRef<HTMLDivElement, ActiveMeetingViewProps>(({
  activeMeeting,
  screenStream,
  cameraStream,
  screenError,
  microphoneEnabled,
  speechRecognitionEnabled,
  isListening,
  isFullscreen,
  isLocalTranscriptionActive,
  isRemoteTranscriptionActive,
  transcriptionActorLabel,
  onToggleTranscription,
  onToggleSpeechRecognition,
  onGenerateSummary,
  onClearAiData,
  onDownloadSummaryPdf,
  onDownloadTranscriptPdf,
  onToggleMicrophone,
  onToggleCamera,
  onStopScreenShare,
  onStartScreenShare,
  onToggleFullscreen,
  onOpenMeetingLink,
  onCopyToClipboard,
  onReturnToMeetings,
}, ref) => {
  const mainVideoRef = useRef<HTMLVideoElement | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  const participantsPanelRef = useRef<HTMLDivElement | null>(null);
  const assistantPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mainVideo = mainVideoRef.current;
    if (mainVideo) {
      const mainStream = screenStream || cameraStream || null;
      if (mainVideo.srcObject !== mainStream) {
        mainVideo.srcObject = mainStream;
      }
    }

    const pipVideo = pipVideoRef.current;
    if (pipVideo) {
      const pipStream = screenStream && cameraStream ? cameraStream : null;
      if (pipVideo.srcObject !== pipStream) {
        pipVideo.srcObject = pipStream;
      }
    }
  }, [cameraStream, screenStream]);

  const meetingParticipants =
    activeMeeting.participants.length > 0
      ? activeMeeting.participants
      : activeMeeting.host
        ? [activeMeeting.host]
        : [];
  const transcriptPreview = activeMeeting.transcript.slice(-6);

  return (
    <div
      ref={ref}
      className="flex-1 flex flex-col min-h-0 rounded-2xl overflow-hidden bg-gradient-to-br from-[#012b33] via-[#01333D] to-[#0c4f5f] text-white"
    >
      <div className="px-6 py-4 border-b border-white/10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-[10px] text-white/60 uppercase tracking-[0.2em]">
            Reunion en cours
          </p>
          <h3 className="text-2xl font-semibold">{activeMeeting.title}</h3>
          <p className="text-xs text-white/70 mt-1">
            {formatDateLabel(activeMeeting.date)} - {activeMeeting.time} -{' '}
            {activeMeeting.durationMinutes} min
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-full">
            <FiUsers size={14} />
            <span>{meetingParticipants.length} participants</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-full font-mono">
            {activeMeeting.meetingCode}
            <button
              type="button"
              onClick={() => onCopyToClipboard(activeMeeting.meetingCode)}
              className="text-white/70 hover:text-white"
            >
              <FiCopy size={12} />
            </button>
          </div>
          {screenError && (
            <div className="flex items-center gap-2 bg-red-500/20 px-3 py-2 rounded-full text-red-100 border border-red-200/40">
              {screenError}
            </div>
          )}
          {activeMeeting.provider === 'google' && (
            <button
              type="button"
              onClick={() => onOpenMeetingLink(activeMeeting)}
              className="px-3 py-2 rounded-full bg-emerald-500/20 text-emerald-100 border border-emerald-200/40 text-[11px] font-semibold"
            >
              Ouvrir Google Meet
            </button>
          )}
          <button
            type="button"
            onClick={onReturnToMeetings}
            className="text-white/80 hover:text-white underline"
          >
            Retour aux reunions
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] gap-4 p-4">
        <div className="flex flex-col gap-4 min-h-0">
          <div className="relative flex-1 rounded-2xl bg-[#001b22] border border-white/10 overflow-hidden">
            {screenStream ? (
              <video
                ref={mainVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain bg-black/40"
              />
            ) : cameraStream ? (
              <video
                ref={mainVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover bg-black/40"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm">
                Video principale
              </div>
            )}

            {screenStream && (
              <>
                <div className="absolute top-4 left-4 bg-emerald-500/20 text-emerald-100 text-[10px] px-2.5 py-1 rounded-full border border-emerald-200/40">
                  Partage d'ecran
                </div>
                {cameraStream && (
                  <div className="absolute bottom-4 right-4 w-32 h-24 rounded-lg overflow-hidden border-2 border-white/20 bg-black/40">
                    <video
                      ref={pipVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </>
            )}

            {cameraStream && !screenStream && (
              <div className="absolute top-4 left-4 bg-emerald-500/20 text-emerald-100 text-[10px] px-2.5 py-1 rounded-full border border-emerald-200/40">
                Caméra
              </div>
            )}

            <div className="absolute bottom-4 left-4 bg-white/10 backdrop-blur px-3 py-2 rounded-lg text-xs text-white/80">
              {activeMeeting.host} - Host
            </div>
            <div className="absolute inset-0 border border-white/10 rounded-2xl pointer-events-none"></div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-[10px] text-white/60">Etat</p>
              <p className="text-sm font-semibold">Live</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-[10px] text-white/60">Timezone</p>
              <p className="text-sm font-semibold">{activeMeeting.timezone}</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-[10px] text-white/60">Assistant IA</p>
              <p className="text-sm font-semibold">{aiStatusLabels[activeMeeting.aiStatus]}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 min-h-0">
          <div ref={participantsPanelRef} className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold">Participants</h4>
              <span className="text-xs text-white/60">
                {meetingParticipants.length} en ligne
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-1">
              {meetingParticipants.map((participant) => (
                <div
                  key={participant}
                  className="rounded-xl bg-white/10 border border-white/10 p-3 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-[#012b33] flex items-center justify-center text-sm font-semibold">
                    {getInitials(participant)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">
                      {participant.split('@')[0]}
                    </p>
                    <p className="text-[10px] text-white/60 truncate">{participant}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div ref={assistantPanelRef} className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col min-h-0">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">Assistant IA</div>
              <div className="flex items-center gap-2">
                {transcriptionActorLabel && activeMeeting.aiStatus === 'listening' && (
                  <span className="text-[10px] text-white/70">
                    Transcription par {transcriptionActorLabel}
                  </span>
                )}
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${aiStatusStyles[activeMeeting.aiStatus]}`}
                >
                  {aiStatusLabels[activeMeeting.aiStatus]}
                </span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onToggleTranscription(activeMeeting.id)}
                disabled={isRemoteTranscriptionActive}
                className="px-2.5 py-1.5 rounded-lg bg-white/15 text-[11px] font-semibold hover:bg-white/25 transition flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <FiMic size={12} />
                {isLocalTranscriptionActive
                  ? 'Pause'
                  : isRemoteTranscriptionActive
                    ? 'Transcription en live'
                    : 'Transcrire'}
              </button>
              <button
                type="button"
                onClick={onToggleSpeechRecognition}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 ${
                  speechRecognitionEnabled
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
                title="Activer la transcription vocale en temps réel"
              >
                <FiVolume2 size={12} />
                {speechRecognitionEnabled ? (isListening ? 'Speech-to-Text (écoute)' : 'Speech-to-Text (prêt)') : 'Speech-to-Text'}
              </button>
              <button
                type="button"
                onClick={() => onGenerateSummary(activeMeeting.id)}
                disabled={activeMeeting.aiStatus === 'summarizing'}
                className="px-2.5 py-1.5 rounded-lg bg-white/15 text-[11px] font-semibold hover:bg-white/25 transition flex items-center gap-1 disabled:opacity-60"
              >
                <FiFileText size={12} />
                Resumer
              </button>
              <button
                type="button"
                onClick={() => onClearAiData(activeMeeting.id)}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 text-[11px] font-semibold hover:bg-white/20 transition"
              >
                Effacer
              </button>
              <button
                type="button"
                onClick={() => onDownloadSummaryPdf(activeMeeting)}
                className="px-2.5 py-1.5 rounded-lg bg-white/15 text-[11px] font-semibold hover:bg-white/25 transition flex items-center gap-1"
              >
                <FiDownload size={12} />
                Resume PDF
              </button>
              <button
                type="button"
                onClick={() => onDownloadTranscriptPdf(activeMeeting)}
                className="px-2.5 py-1.5 rounded-lg bg-white/15 text-[11px] font-semibold hover:bg-white/25 transition flex items-center gap-1"
              >
                <FiDownload size={12} />
                Transcription PDF
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 flex-1 min-h-0">
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-xs text-white/60 mb-1">Resume</p>
                <p className="text-xs text-white/90 leading-relaxed">
                  {activeMeeting.summary || 'Resume en attente.'}
                </p>
              </div>
              <div className="rounded-xl bg-white/10 p-3 flex-1 min-h-0 overflow-y-auto">
                <p className="text-xs text-white/60 mb-2">Transcription</p>
                <div className="space-y-2">
                  {transcriptPreview.length === 0 && (
                    <p className="text-xs text-white/60">
                      La transcription demarrera automatiquement.
                    </p>
                  )}
                  {transcriptPreview.map((entry) => (
                    <div key={entry.id} className="text-xs text-white/90">
                      <span className="text-white/60">{entry.time}</span>{' '}
                      <span className="font-semibold">{entry.speaker}:</span>{' '}
                      {entry.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-white/10 bg-[#012a35]/90 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="text-xs text-white/70 flex items-center gap-3">
          <span className="font-mono bg-white/10 px-2 py-1 rounded-full">
            {activeMeeting.meetingCode}
          </span>
          <span className="bg-white/10 px-2 py-1 rounded-full">
            {activeMeeting.timezone}
          </span>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onToggleMicrophone}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition ${
              microphoneEnabled
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
            title={microphoneEnabled ? 'Désactiver microphone' : 'Activer microphone'}
          >
            {microphoneEnabled ? <FiMic size={18} /> : <FiMicOff size={18} />}
          </button>
          <button
            type="button"
            onClick={onToggleCamera}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition ${
              cameraStream
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
            title={cameraStream ? "Désactiver caméra" : "Activer caméra"}
          >
            {cameraStream ? <FiVideo size={18} /> : <FiVideoOff size={18} />}
          </button>
          <button
            type="button"
            onClick={screenStream ? onStopScreenShare : onStartScreenShare}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition ${
              screenStream
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
            title={screenStream ? "Arreter le partage d'ecran" : "Partager l'ecran"}
          >
            <FiMonitor size={18} />
          </button>
          <button
            type="button"
            onClick={() => participantsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition"
            title="Voir les participants"
          >
            <FiUsers size={18} />
          </button>
          <button
            type="button"
            onClick={() => assistantPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition"
            title="Voir le chat/assistant"
          >
            <FiMessageSquare size={18} />
          </button>
          <button
            type="button"
            onClick={onReturnToMeetings}
            className="w-11 h-11 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition"
            title="Quitter le meet"
          >
            <FiPhoneOff size={18} />
          </button>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition"
            title={isFullscreen ? 'Quitter le plein ecran' : 'Plein ecran'}
          >
            {isFullscreen ? <FiMinimize size={18} /> : <FiMaximize size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
});
