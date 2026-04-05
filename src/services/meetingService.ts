import { apiService } from './api'
import type { Meeting, MeetingFormState } from '../components/Meetings/types'

export interface MeetingResponse {
  id: string
  titre: string
  description?: string
  heureDebut: string
  heureFin?: string
  statut: string
  lien: string
  creeA: string
  idHote: string
  transcriptions?: unknown[]
  resume?: unknown
  hote?: {
    id: string
    nom?: string
    email?: string
  }
  participants?: Array<{
    id: string
    utilisateurId: string
    role?: string
    rejointA?: string
    utilisateur?: {
      id: string
      nom: string
      email: string
    }
  }>
}

export interface Participant {
  id: string
  utilisateurId: string
  reunionId: string
  role: string
  rejointA: string
  utilisateur?: {
    id: string
    nom: string
    email: string
  }
}

export const meetingService = {
  async getAll(): Promise<Meeting[]> {
    const response = await apiService.get<MeetingResponse[]>('/reunions')
    if (response.error) {
      throw new Error(response.error)
    }
    return (response.data || []).map((meeting) => this.transformMeeting(meeting))
  },

  async getById(id: string): Promise<Meeting> {
    const response = await apiService.get<MeetingResponse>(`/reunions/${id}`)
    if (response.error) {
      throw new Error(response.error)
    }
    return this.transformMeeting(response.data!)
  },

  async create(formState: MeetingFormState & { invitedUserIds?: string[] }): Promise<Meeting> {
    const response = await apiService.post<MeetingResponse>('/reunions', {
      titre: formState.title,
      description: formState.description,
      heureDebut: `${formState.date}T${formState.time}:00`,
      heureFin: formState.duration
        ? new Date(new Date(`${formState.date}T${formState.time}:00`).getTime() + formState.duration * 60000).toISOString()
        : undefined,
      invitedUserIds: formState.invitedUserIds,
    })
    if (response.error) {
      throw new Error(response.error)
    }
    return this.transformMeeting(response.data!)
  },

  async update(id: string, formState: Partial<MeetingFormState>): Promise<Meeting> {
    const response = await apiService.put<MeetingResponse>(`/reunions/${id}`, {
      titre: formState.title,
      description: formState.description,
      heureDebut: formState.date && formState.time
        ? `${formState.date}T${formState.time}:00`
        : undefined,
      heureFin: formState.duration
        ? new Date(new Date(`${formState.date}T${formState.time}:00`).getTime() + formState.duration * 60000).toISOString()
        : undefined,
    })
    if (response.error) {
      throw new Error(response.error)
    }
    return this.transformMeeting(response.data!)
  },

  async start(id: string): Promise<Meeting> {
    const response = await apiService.post<MeetingResponse>(`/reunions/${id}/start`, {})
    if (response.error) {
      throw new Error(response.error)
    }
    return this.transformMeeting(response.data!)
  },

  async end(id: string): Promise<Meeting> {
    const response = await apiService.post<MeetingResponse | { meeting: MeetingResponse }>(`/reunions/${id}/end`, {})
    if (response.error) {
      throw new Error(response.error)
    }
    const payload = response.data && 'meeting' in response.data
      ? response.data.meeting
      : response.data
    return this.transformMeeting(payload!)
  },

  async cancel(id: string): Promise<Meeting> {
    const response = await apiService.post<MeetingResponse>(`/reunions/${id}/cancel`, {})
    if (response.error) {
      throw new Error(response.error)
    }
    return this.transformMeeting(response.data!)
  },

  async join(id: string): Promise<void> {
    const response = await apiService.post(`/reunions/${id}/join`, {})
    if (response.error) {
      throw new Error(response.error)
    }
  },

  async duplicate(id: string): Promise<Meeting> {
    const response = await apiService.post<MeetingResponse>(`/reunions/${id}/duplicate`, {})
    if (response.error) {
      throw new Error(response.error)
    }
    return this.transformMeeting(response.data!)
  },

  async getParticipants(id: string): Promise<Participant[]> {
    const response = await apiService.get<Participant[]>(`/reunions/${id}/participants`)
    if (response.error) {
      throw new Error(response.error)
    }
    return response.data || []
  },

  async addParticipant(id: string, utilisateurId: string, role?: string): Promise<Participant> {
    const response = await apiService.post<Participant>(`/reunions/${id}/participants`, {
      utilisateurId,
      role: role || 'PARTICIPANT',
    })
    if (response.error) {
      throw new Error(response.error)
    }
    return response.data!
  },

  async removeParticipant(id: string, participantId: string): Promise<void> {
    const response = await apiService.delete(`/reunions/${id}/participants/${participantId}`)
    if (response.error) {
      throw new Error(response.error)
    }
  },

  async getTranscript(id: string): Promise<unknown> {
    const response = await apiService.get(`/reunions/${id}/transcript`)
    if (response.error) {
      throw new Error(response.error)
    }
    return response.data
  },

  async getSummary(id: string): Promise<unknown> {
    const response = await apiService.get(`/reunions/${id}/summary`)
    if (response.error) {
      throw new Error(response.error)
    }
    return response.data
  },

  transformMeeting(data: MeetingResponse): Meeting {
    const heureDebut = new Date(data.heureDebut)
    const heureFin = data.heureFin ? new Date(data.heureFin) : null
    const durationMinutes = heureFin
      ? Math.round((heureFin.getTime() - heureDebut.getTime()) / 60000)
      : 30
    const formatDisplayName = (nom?: string | null, email?: string | null, fallback?: string) => {
      if (nom && nom.trim().length > 0) return nom.trim()
      if (email && email.trim().length > 0) return email.trim()
      return fallback || 'Participant'
    }

    const hostDisplayName = formatDisplayName(data.hote?.nom, data.hote?.email, data.idHote)
    const participantNames = new Set<string>()
    participantNames.add(hostDisplayName)

    ;(data.participants || []).forEach((participant) => {
      const participantDisplayName = formatDisplayName(
        participant.utilisateur?.nom,
        participant.utilisateur?.email,
        participant.utilisateurId,
      )
      participantNames.add(participantDisplayName)
    })

    return {
      id: data.id,
      title: data.titre,
      date: heureDebut.toISOString().split('T')[0],
      time: heureDebut.toTimeString().slice(0, 5),
      duration: durationMinutes,
      durationMinutes,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      description: data.description || '',
      participants: Array.from(participantNames),
      host: hostDisplayName,
      roomId: data.lien,
      meetingCode: data.lien,
      link: data.lien,
      provider: 'meetsync',
      status: this.transformStatus(data.statut),
      transcript: [],
      summary: '',
      aiStatus: 'idle',
      transcriptCursor: 0,
      createdAt: data.creeA,
      updatedAt: data.creeA,
    }
  },

  transformStatus(statut: string): 'scheduled' | 'live' | 'completed' | 'canceled' {
    switch (statut) {
      case 'PLANIFIEE':
        return 'scheduled'
      case 'EN_COURS':
        return 'live'
      case 'TERMINEE':
        return 'completed'
      case 'ANNULEE':
        return 'canceled'
      default:
        return 'scheduled'
    }
  },
}
