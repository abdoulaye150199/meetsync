export type PresenceStatus = 'online' | 'offline' | 'away';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface ChatUser {
  id: string;
  name: string;
  avatar: string;
}

export interface Contact extends ChatUser {
  status: PresenceStatus;
  role?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  status: MessageStatus;
}

export interface TypingPayload {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface PresencePayload {
  userId: string;
  status: PresenceStatus;
}

export interface ReadPayload {
  conversationId: string;
  userId: string;
  messageId: string;
}

export type ChatEvent =
  | { type: 'message'; payload: ChatMessage }
  | { type: 'typing'; payload: TypingPayload }
  | { type: 'presence'; payload: PresencePayload }
  | { type: 'read'; payload: ReadPayload };
