import { apiService } from './api'
import type { Task, TaskFormState } from '../components/Meetings/types'

export interface TaskResponse {
  id: string
  titre: string
  description?: string
  priorite: string
  statut: string
  dateEcheance?: string
  creeA: string
  modifieA: string
  reunionId: string
  idAssigne?: string
  reunion?: {
    id: string
    titre: string
  }
  assigne?: {
    id: string
    nom: string
    email: string
  }
}

export const taskService = {
  async getAll(): Promise<Task[]> {
    const response = await apiService.get<TaskResponse[]>('/taches')
    if (response.error) {
      throw new Error(response.error)
    }
    return (response.data || []).map(this.transformTask)
  },

  async getById(id: string): Promise<Task> {
    const response = await apiService.get<TaskResponse>(`/taches/${id}`)
    if (response.error) {
      throw new Error(response.error)
    }
    return this.transformTask(response.data!)
  },

  async create(formState: TaskFormState): Promise<Task> {
    const response = await apiService.post<TaskResponse>('/taches', {
      titre: formState.title,
      description: formState.description,
      priorite: this.transformPriorityToBackend(formState.priority),
      dateEcheance: formState.dueDate ? new Date(formState.dueDate).toISOString() : undefined,
      idAssigne: formState.assignedTo || undefined,
      reunionId: formState.meetingId || undefined,
    })
    if (response.error) {
      throw new Error(response.error)
    }
    return this.transformTask(response.data!)
  },

  async update(id: string, formState: Partial<TaskFormState>): Promise<Task> {
    const response = await apiService.put<TaskResponse>(`/taches/${id}`, {
      titre: formState.title,
      description: formState.description,
      priorite: formState.priority ? this.transformPriorityToBackend(formState.priority) : undefined,
      dateEcheance: formState.dueDate ? new Date(formState.dueDate).toISOString() : undefined,
      idAssigne: formState.assignedTo,
    })
    if (response.error) {
      throw new Error(response.error)
    }
    return this.transformTask(response.data!)
  },

  async delete(id: string): Promise<void> {
    const response = await apiService.delete(`/taches/${id}`)
    if (response.error) {
      throw new Error(response.error)
    }
  },

  async updateStatus(id: string, status: 'pending' | 'in-progress' | 'completed'): Promise<Task> {
    const response = await apiService.patch<TaskResponse>(`/taches/${id}/status`, {
      statut: this.transformStatusToBackend(status),
    })
    if (response.error) {
      throw new Error(response.error)
    }
    return this.transformTask(response.data!)
  },

  async getByMeeting(meetingId: string): Promise<Task[]> {
    const response = await apiService.get<TaskResponse[]>(`/reunions/${meetingId}/taches`)
    if (response.error) {
      throw new Error(response.error)
    }
    return (response.data || []).map(this.transformTask)
  },

  async createForMeeting(meetingId: string, formState: TaskFormState): Promise<Task> {
    const response = await apiService.post<TaskResponse>(`/reunions/${meetingId}/taches`, {
      titre: formState.title,
      description: formState.description,
      priorite: this.transformPriorityToBackend(formState.priority),
      dateEcheance: formState.dueDate ? new Date(formState.dueDate).toISOString() : undefined,
      idAssigne: formState.assignedTo || undefined,
    })
    if (response.error) {
      throw new Error(response.error)
    }
    return this.transformTask(response.data!)
  },

  transformTask(data: TaskResponse): Task {
    return {
      id: data.id,
      title: data.titre,
      description: data.description || '',
      meetingId: data.reunionId,
      priority: this.transformPriorityFromBackend(data.priorite),
      status: this.transformStatusFromBackend(data.statut),
      assignedTo: data.idAssigne,
      dueDate: data.dateEcheance ? new Date(data.dateEcheance).toISOString().split('T')[0] : undefined,
      tags: [],
      createdAt: data.creeA,
      updatedAt: data.modifieA,
    }
  },

  transformPriorityToBackend(priority: 'low' | 'medium' | 'high'): string {
    switch (priority) {
      case 'low':
        return 'BASSE'
      case 'medium':
        return 'MOYENNE'
      case 'high':
        return 'HAUTE'
      default:
        return 'MOYENNE'
    }
  },

  transformPriorityFromBackend(priority: string): 'low' | 'medium' | 'high' {
    switch (priority) {
      case 'BASSE':
        return 'low'
      case 'MOYENNE':
        return 'medium'
      case 'HAUTE':
        return 'high'
      default:
        return 'medium'
    }
  },

  transformStatusToBackend(status: 'pending' | 'in-progress' | 'completed'): string {
    switch (status) {
      case 'pending':
        return 'EN_ATTENTE'
      case 'in-progress':
        return 'EN_COURS'
      case 'completed':
        return 'TERMINEE'
      default:
        return 'EN_ATTENTE'
    }
  },

  transformStatusFromBackend(status: string): 'pending' | 'in-progress' | 'completed' {
    switch (status) {
      case 'EN_ATTENTE':
        return 'pending'
      case 'EN_COURS':
        return 'in-progress'
      case 'TERMINEE':
        return 'completed'
      default:
        return 'pending'
    }
  },
}
