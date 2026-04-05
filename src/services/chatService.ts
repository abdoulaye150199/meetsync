import { apiService } from './api'
import type { ChatMessage } from '../types/chat'

export interface MessageResponse {
  meetingId: string
  senderId: string
  senderName?: string
  message: string
  createdAt: string
}

export const chatService = {
  async getMessages(meetingId: string): Promise<ChatMessage[]> {
    const response = await apiService.get<MessageResponse[]>(`/reunions/${meetingId}/messages`)
    if (response.error) {
      throw new Error(response.error)
    }
    return (response.data || []).map((msg) => this.transformMessage(msg, meetingId))
  },

  async sendMessage(meetingId: string, senderId: string, message: string, senderName?: string): Promise<ChatMessage> {
    const response = await apiService.post<MessageResponse>(`/reunions/${meetingId}/messages`, {
      senderId,
      senderName,
      message,
    })
    if (response.error) {
      throw new Error(response.error)
    }
    return this.transformMessage(response.data!, meetingId)
  },

  transformMessage(data: MessageResponse, meetingId: string): ChatMessage {
    return {
      id: `${data.senderId}-${data.createdAt}`,
      conversationId: meetingId,
      senderId: data.senderId,
      text: data.message,
      createdAt: data.createdAt,
      status: 'sent',
    }
  },
}
