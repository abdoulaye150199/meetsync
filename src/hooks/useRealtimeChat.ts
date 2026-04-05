import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { apiService } from '../services/api';
import type {
  ChatMessage,
  ChatUser,
  Contact,
  MessageStatus,
  PresenceStatus,
  TypingPayload,
} from '../types/chat';

const STORAGE_KEY = 'meetsync.chat.v2';

export type ConnectionState = 'connecting' | 'connected' | 'offline';

interface UseRealtimeChatOptions {
  currentUser: ChatUser;
  contacts: Contact[];
  seedMessages?: Record<string, ChatMessage[]>;
}

interface TypingState {
  [conversationId: string]: TypingPayload | null;
}

interface PresenceState {
  [userId: string]: PresenceStatus;
}

interface DirectMessageResponse {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  message: string;
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
}

interface DirectSocketMessage {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  message: string;
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
}

const safeParse = (value: string | null) => {
  if (!value) return null;
  try {
    return JSON.parse(value) as Record<string, ChatMessage[]>;
  } catch {
    return null;
  }
};

const nowIso = () => new Date().toISOString();

const toMessageStatus = (status: string | undefined): MessageStatus => {
  if (status === 'sent' || status === 'delivered' || status === 'read') return status;
  return 'delivered';
};

const buildConversationId = (a: string, b: string) => [a, b].sort().join(':');

const getSocketUrl = () => {
  const envUrl = import.meta.env.VITE_CHAT_SOCKET_URL;
  if (envUrl) return envUrl;

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  return apiUrl.replace(/\/api\/?$/, '');
};

const toContactConversationKey = (
  payload: Pick<DirectSocketMessage, 'senderId' | 'recipientId'>,
  currentUserId: string,
) => {
  return payload.senderId === currentUserId ? payload.recipientId : payload.senderId;
};

export const useRealtimeChat = ({
  currentUser,
  contacts,
  seedMessages,
}: UseRealtimeChatOptions) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [messagesByConversation, setMessagesByConversation] = useState<
    Record<string, ChatMessage[]>
  >(() => {
    if (typeof window === 'undefined') return seedMessages ?? {};
    return safeParse(window.localStorage.getItem(STORAGE_KEY)) ?? seedMessages ?? {};
  });
  const [typingByConversation, setTypingByConversation] = useState<TypingState>({});
  const [presenceByUser, setPresenceByUser] = useState<PresenceState>(() => {
    return contacts.reduce<PresenceState>((acc, contact) => {
      acc[contact.id] = contact.status;
      return acc;
    }, {});
  });
  const socketRef = useRef<Socket | null>(null);
  const typingTimeouts = useRef<Record<string, number>>({});
  const loadedContacts = useRef<Set<string>>(new Set());
  const contactsRef = useRef<Contact[]>(contacts);
  const joinedConversations = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messagesByConversation));
  }, [messagesByConversation]);

  useEffect(() => {
    contactsRef.current = contacts;

    setPresenceByUser((prev) => {
      const next = { ...prev };
      contacts.forEach((contact) => {
        if (!next[contact.id]) {
          next[contact.id] = contact.status;
        }
      });
      return next;
    });
  }, [contacts]);

  const joinKnownConversations = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected || !currentUser.id) return;

    contactsRef.current.forEach((contact) => {
      if (contact.id === currentUser.id) return;

      const roomId = buildConversationId(currentUser.id, contact.id);
      if (joinedConversations.current.has(roomId)) return;

      socket.emit('join-conversation', roomId);
      joinedConversations.current.add(roomId);
    });
  }, [currentUser.id]);

  useEffect(() => {
    if (!currentUser.id || contacts.length === 0) return;
    let cancelled = false;

    const loadConversation = async (contactId: string) => {
      if (loadedContacts.current.has(contactId)) return;
      loadedContacts.current.add(contactId);

      const response = await apiService.get<DirectMessageResponse[]>(
        `/discussions/direct/${contactId}/messages`,
      );
      if (cancelled || response.error) return;

      const list = (response.data || []).map((item) => ({
        id: item.id,
        conversationId: contactId,
        senderId: item.senderId,
        text: item.message,
        createdAt: item.createdAt,
        status: toMessageStatus(item.status),
      }));

      setMessagesByConversation((prev) => ({
        ...prev,
        [contactId]: list,
      }));
    };

    contacts.forEach((contact) => {
      if (contact.id !== currentUser.id) {
        void loadConversation(contact.id);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [contacts, currentUser.id]);

  useEffect(() => {
    if (!currentUser.id) return;

    const socket = io(getSocketUrl(), {
      path: '/socket.io',
      // Keep polling fallback when direct websocket upgrade is blocked.
      transports: ['polling', 'websocket'],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
    socketRef.current = socket;
    joinedConversations.current.clear();

    setConnectionState('connecting');

    socket.on('connect', () => {
      setConnectionState('connected');
      socket.emit('register-user', { userId: currentUser.id });
      joinKnownConversations();
    });

    socket.on('disconnect', () => {
      setConnectionState('offline');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connect_error:', error?.message ?? error);
      setConnectionState('offline');
    });

    socket.on('presence', (payload: { userId: string; status: PresenceStatus }) => {
      setPresenceByUser((prev) => ({
        ...prev,
        [payload.userId]: payload.status,
      }));
    });

    socket.on('presence-snapshot', (users: { userId: string; status: PresenceStatus }[]) => {
      setPresenceByUser((prev) => {
        const next = { ...prev };
        users.forEach((user) => {
          next[user.userId] = user.status;
        });
        return next;
      });
    });

    socket.on('chat-message', (payload: DirectSocketMessage) => {
      const conversationKey = toContactConversationKey(payload, currentUser.id);
      const message: ChatMessage = {
        id: payload.id,
        conversationId: conversationKey,
        senderId: payload.senderId,
        text: payload.message,
        createdAt: payload.createdAt,
        status: toMessageStatus(payload.status),
      };

      setMessagesByConversation((prev) => {
        const list = prev[conversationKey] ?? [];
        const exists = list.some((item) => item.id === message.id);
        if (exists) return prev;

        // If this message is an echo of an optimistic local message, replace it
        // instead of appending a duplicate.
        if (payload.senderId === currentUser.id) {
          const optimisticIndex = list.findIndex(
            (item) =>
              item.senderId === currentUser.id &&
              item.status === 'sending' &&
              item.text === payload.message,
          );
          if (optimisticIndex >= 0) {
            const next = [...list];
            next[optimisticIndex] = message;
            return {
              ...prev,
              [conversationKey]: next,
            };
          }
        }

        return {
          ...prev,
          [conversationKey]: [...list, message],
        };
      });
    });

    socket.on('typing-direct', (payload: {
      fromUserId: string;
      toUserId: string;
      isTyping: boolean;
    }) => {
      const conversationKey = payload.fromUserId;
      setTypingByConversation((prev) => ({
        ...prev,
        [conversationKey]: payload.isTyping
          ? { conversationId: conversationKey, userId: payload.fromUserId, isTyping: true }
          : null,
      }));

      if (typingTimeouts.current[conversationKey]) {
        window.clearTimeout(typingTimeouts.current[conversationKey]);
      }

      if (payload.isTyping) {
        typingTimeouts.current[conversationKey] = window.setTimeout(() => {
          setTypingByConversation((prev) => ({ ...prev, [conversationKey]: null }));
        }, 1800);
      }
    });

    socket.on('conversation-read', (payload: { conversationId: string; readerId: string }) => {
      const ids = payload.conversationId.split(':');
      const conversationKey = ids.find((id) => id !== currentUser.id);
      if (!conversationKey) return;

      setMessagesByConversation((prev) => {
        const list = prev[conversationKey] ?? [];
        return {
          ...prev,
          [conversationKey]: list.map((msg) =>
            msg.senderId === currentUser.id ? { ...msg, status: 'read' } : msg,
          ),
        };
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUser.id, joinKnownConversations]);

  useEffect(() => {
    joinKnownConversations();
  }, [contacts, joinKnownConversations]);

  const updateMessageStatus = useCallback(
    (conversationId: string, messageId: string, status: MessageStatus) => {
      setMessagesByConversation((prev) => {
        const list = prev[conversationId] ?? [];
        return {
          ...prev,
          [conversationId]: list.map((item) =>
            item.id === messageId ? { ...item, status } : item,
          ),
        };
      });
    },
    [],
  );

  const sendMessage = useCallback(
    (conversationId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const tempId = `${currentUser.id}-${Date.now()}`;
      const optimisticMessage: ChatMessage = {
        id: tempId,
        conversationId,
        senderId: currentUser.id,
        text: trimmed,
        createdAt: nowIso(),
        status: 'sending',
      };

      setMessagesByConversation((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] ?? []), optimisticMessage],
      }));

      const socket = socketRef.current;
      if (!socket || !socket.connected) {
        updateMessageStatus(conversationId, tempId, 'failed');
        return;
      }

      socket.emit(
        'direct-message',
        {
          senderId: currentUser.id,
          recipientId: conversationId,
          message: trimmed,
        },
        (ack: { ok: boolean; message?: DirectSocketMessage }) => {
          if (!ack?.ok || !ack.message) {
            updateMessageStatus(conversationId, tempId, 'failed');
            return;
          }

          setMessagesByConversation((prev) => {
            const list = prev[conversationId] ?? [];
            const alreadyStored = list.some((item) => item.id === ack.message!.id);
            if (alreadyStored) {
              return {
                ...prev,
                [conversationId]: list.filter((item) => item.id !== tempId),
              };
            }

            return {
              ...prev,
              [conversationId]: list.map((item) =>
                item.id === tempId
                  ? {
                      id: ack.message!.id,
                      conversationId,
                      senderId: currentUser.id,
                      text: ack.message!.message,
                      createdAt: ack.message!.createdAt,
                      status: toMessageStatus(ack.message!.status),
                    }
                  : item,
              ),
            };
          });
        },
      );
    },
    [currentUser.id, updateMessageStatus],
  );

  const setTyping = useCallback(
    (conversationId: string, isTyping: boolean) => {
      const socket = socketRef.current;
      if (!socket || !socket.connected) return;

      socket.emit('typing-direct', {
        fromUserId: currentUser.id,
        toUserId: conversationId,
        isTyping,
      });
    },
    [currentUser.id],
  );

  const markConversationRead = useCallback(
    (conversationId: string) => {
      setMessagesByConversation((prev) => {
        const list = prev[conversationId] ?? [];
        return {
          ...prev,
          [conversationId]: list.map((item) =>
            item.senderId !== currentUser.id && item.status !== 'read'
              ? { ...item, status: 'read' }
              : item,
          ),
        };
      });

      const socket = socketRef.current;
      if (socket && socket.connected) {
        socket.emit('read-direct', {
          readerId: currentUser.id,
          otherUserId: conversationId,
        });
      }
    },
    [currentUser.id],
  );

  const unreadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.entries(messagesByConversation).forEach(([conversationId, list]) => {
      counts[conversationId] = list.filter(
        (message) => message.senderId !== currentUser.id && message.status !== 'read',
      ).length;
    });
    return counts;
  }, [currentUser.id, messagesByConversation]);

  return {
    connectionState,
    messagesByConversation,
    sendMessage,
    setTyping,
    typingByConversation,
    presenceByUser,
    markConversationRead,
    unreadCounts,
  };
};
