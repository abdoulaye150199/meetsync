import { useEffect, useRef, useState } from 'react';

interface UseSpeechRecognitionProps {
  enabled: boolean;
  onTranscript: (text: string, isFinal: boolean) => void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  language: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
}

interface SpeechRecognitionErrorEvent extends Event {
  error:
    | 'no-speech'
    | 'network'
    | 'aborted'
    | 'service-not-allowed'
    | 'bad-grammar'
    | 'audio-capture'
    | 'not-allowed'
    | 'language-not-supported';
}

const useSpeechRecognition = ({ enabled, onTranscript }: UseSpeechRecognitionProps) => {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const transcriptRef = useRef('');
  const isSupported =
    typeof window !== 'undefined' &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    const SpeechRecognitionAPI =
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (SpeechRecognitionAPI) {
      recognitionRef.current = new SpeechRecognitionAPI();

      const recognition = recognitionRef.current;
      if (recognition) {
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.language = 'fr-FR';

        recognition.onstart = () => {
          setIsListening(true);
          setError(null);
          transcriptRef.current = '';
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          // "aborted" and "no-speech" can happen during normal stop/restart cycles.
          // Do not surface them as blocking UI errors.
          if (event.error === 'aborted' || event.error === 'no-speech') {
            setIsListening(false);
            return;
          }

          const errorMessage = `Speech Recognition Error: ${event.error}`;
          setError(errorMessage);
          setIsListening(false);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;

            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            transcriptRef.current = (transcriptRef.current + finalTranscript).trim();
            onTranscript(finalTranscript.trim(), true);
            // Reset interim transcript
            transcriptRef.current = '';
          }

          if (interimTranscript && !finalTranscript) {
            onTranscript(interimTranscript, false);
          }
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onTranscript]);

  useEffect(() => {
    if (!isSupported || !recognitionRef.current) return;

    const recognition = recognitionRef.current;

    if (enabled && !isListening) {
      try {
        recognition.start();
      } catch {
        // Already started
      }
    } else if (!enabled && isListening) {
      try {
        recognition.stop();
      } catch {
        // Already stopped
      }
    }
  }, [enabled, isListening, isSupported]);

  return {
    isListening,
    isSupported,
    error,
  };
};

export default useSpeechRecognition;
