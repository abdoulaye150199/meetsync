import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiImage,
  FiLink2,
  FiMic,
  FiPaperclip,
  FiSend,
  FiSmile,
  FiVideo,
  FiMessageSquare,
} from 'react-icons/fi';
import type { ChatMessage, ChatUser, Contact, PresenceStatus, TypingPayload } from '../../types/chat';
import type { ConnectionState } from '../../hooks/useRealtimeChat';

interface ChatPanelProps {
  currentUser: ChatUser;
  contact: Contact | null;
  messages: ChatMessage[];
  presence?: PresenceStatus;
  connectionState: ConnectionState;
  typing?: TypingPayload | null;
  onSendMessage: (text: string) => void;
  onTyping: (isTyping: boolean) => void;
  onStartVideoCall?: () => void;
}

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const connectionLabels: Record<ConnectionState, string> = {
  connecting: 'Connexion...',
  connected: 'Connecte',
  offline: 'Hors ligne',
};

const connectionStyles: Record<ConnectionState, string> = {
  connecting: 'bg-amber-100 text-amber-700',
  connected: 'bg-emerald-100 text-emerald-700',
  offline: 'bg-red-100 text-red-600',
};

const presenceLabels: Record<PresenceStatus, string> = {
  online: 'En ligne',
  away: 'Absent',
  offline: 'Hors ligne',
};

const presenceDots: Record<PresenceStatus, string> = {
  online: 'bg-emerald-400',
  away: 'bg-amber-400',
  offline: 'bg-gray-400',
};

const messageStatusLabel = (status: ChatMessage['status']) => {
  if (status === 'sending') return '...';
  if (status === 'sent') return 'v';
  if (status === 'delivered') return 'vv';
  if (status === 'read') return 'vv';
  return '!';
};

const messageStatusStyles: Record<ChatMessage['status'], string> = {
  sending: 'text-gray-300',
  sent: 'text-white/70',
  delivered: 'text-white/70',
  read: 'text-emerald-200',
  failed: 'text-red-300',
};

const ChatPanel = ({
  currentUser,
  contact,
  messages,
  presence = 'offline',
  connectionState,
  typing,
  onSendMessage,
  onTyping,
  onStartVideoCall,
}: ChatPanelProps) => {
  const [messageText, setMessageText] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  const sortedMessages = useMemo(() => {
    return [...messages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sortedMessages.length, typing?.isTyping]);

  if (!contact) {
    return (
      <div className="flex items-center justify-center flex-1 bg-white rounded-lg">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 text-gray-400 mb-4">
            <FiMessageSquare size={30} />
          </div>
          <h3 className="text-gray-600 font-medium mb-2">Selectionnez une discussion</h3>
          <p className="text-gray-500 text-sm">
            Choisissez un collaborateur pour demarrer une conversation.
          </p>
        </div>
      </div>
    );
  }

  const typingLabel = typing?.isTyping && typing.userId !== currentUser.id;

  return (
    <div className="flex-1 flex flex-col bg-white rounded-lg overflow-hidden">
      <header className="flex items-center justify-between gap-4 border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src={contact.avatar} alt={contact.name} className="w-12 h-12 rounded-full" />
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                presenceDots[presence]
              }`}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">{contact.name}</h3>
            <p className="text-xs text-gray-500">
              {presenceLabels[presence]} - {contact.role ?? 'Equipe MeetSync'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
              connectionStyles[connectionState]
            }`}
          >
            {connectionLabels[connectionState]}
          </span>
          <button
            onClick={onStartVideoCall}
            disabled={!onStartVideoCall}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Appel vidéo"
          >
            <FiVideo size={18} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-gray-50 p-6 space-y-4">
        {sortedMessages.map((msg) => {
          const isMine = msg.senderId === currentUser.id;
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {!isMine && (
                <img src={contact.avatar} alt={contact.name} className="w-10 h-10 rounded-full" />
              )}
              <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                <div
                  className={`px-4 py-2 rounded-2xl max-w-xs shadow-sm ${
                    isMine
                      ? 'bg-[#01333D] text-white rounded-br-sm'
                      : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-gray-400">{formatTime(msg.createdAt)}</span>
                  {isMine && (
                    <span className={`text-[10px] ${messageStatusStyles[msg.status]}`}>
                      {messageStatusLabel(msg.status)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {typingLabel && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {contact.name} est en train d'ecrire...
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t bg-white p-4">
        <div className="flex items-center gap-2 bg-[#01333D] rounded-t-lg px-4 py-2 mb-3 text-white">
          <button className="p-2 hover:bg-white/10 rounded transition" title="Ajouter un fichier">
            <FiPaperclip size={16} />
          </button>
          <button className="p-2 hover:bg-white/10 rounded transition" title="Joindre une image">
            <FiImage size={16} />
          </button>
          <button className="p-2 hover:bg-white/10 rounded transition" title="Inserer un lien">
            <FiLink2 size={16} />
          </button>
          <button className="p-2 hover:bg-white/10 rounded transition" title="Message vocal">
            <FiMic size={16} />
          </button>
        </div>

        <div className="flex items-end gap-3">
          <textarea
            value={messageText}
            onChange={(event) => {
              setMessageText(event.target.value);
              onTyping(true);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                if (!messageText.trim()) return;
                onSendMessage(messageText);
                setMessageText('');
                onTyping(false);
              }
            }}
            onBlur={() => onTyping(false)}
            rows={2}
            placeholder="Ecrire un message..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#01333D] resize-none"
          />
          <button className="p-3 text-[#01333D] hover:bg-gray-100 rounded-lg transition">
            <FiSmile size={20} />
          </button>
          <button
            className="p-3 bg-[#01333D] text-white hover:bg-opacity-90 rounded-lg transition"
            onClick={() => {
              if (!messageText.trim()) return;
              onSendMessage(messageText);
              setMessageText('');
              onTyping(false);
            }}
          >
            <FiSend size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
