import React from 'react';
import {
  FaCalendarAlt,
  FaClock,
  FaUsers,
  FaIdBadge,
  FaEdit,
  FaSignInAlt,
  FaPlus,
  FaCheck,
  FaTrash,
  FaExclamationTriangle,
  FaUser,
} from 'react-icons/fa';
import type { Meeting, Task } from './types';

interface MeetingDetailsProps {
  meeting: Meeting;
  tasks: Task[];
  onEdit: () => void;
  onJoin: () => void;
  onCreateTask: () => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
}

export const MeetingDetails: React.FC<MeetingDetailsProps> = ({
  meeting,
  tasks,
  onEdit,
  onJoin,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canJoin = meeting.status === 'scheduled' || meeting.status === 'live';

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{meeting.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(meeting.status)}`}>
                {meeting.status === 'scheduled' && 'Planifiée'}
                {meeting.status === 'live' && 'En cours'}
                {meeting.status === 'completed' && 'Terminée'}
              </span>
              {meeting.isRecurring && (
                <span className="text-blue-600 font-medium">
                  Récurrente ({meeting.recurrencePattern})
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Modifier la réunion"
            >
              <FaEdit className="w-5 h-5" />
            </button>
            {canJoin && (
              <button
                onClick={onJoin}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title="Rejoindre la réunion"
              >
                <FaSignInAlt className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {meeting.description && (
          <p className="text-gray-700 mb-4">{meeting.description}</p>
        )}

        {/* Meeting Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <FaCalendarAlt className="w-4 h-4 text-gray-400" />
            <span>{formatDate(meeting.date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <FaClock className="w-4 h-4 text-gray-400" />
            <span>{formatTime(meeting.time)} ({meeting.duration ?? meeting.durationMinutes} min)</span>
          </div>
          <div className="flex items-center gap-2">
            <FaIdBadge className="w-4 h-4 text-gray-400" />
            <span>Code: {meeting.roomId || meeting.meetingCode}</span>
          </div>
          <div className="flex items-center gap-2">
            <FaUsers className="w-4 h-4 text-gray-400" />
            <span>{meeting.participants.length} participant(s)</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Participants */}
          {meeting.participants.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Participants</h3>
              <div className="flex flex-wrap gap-2">
                {meeting.participants.map((participant, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {participant}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tasks */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Tâches</h3>
              <button
                onClick={onCreateTask}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title="Créer une tâche"
              >
                <FaPlus className="w-4 h-4" />
              </button>
            </div>

            {tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FaCheck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Aucune tâche pour cette réunion</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            checked={task.status === 'completed'}
                            onChange={(e) =>
                              onUpdateTask(task.id, {
                                status: e.target.checked ? 'completed' : 'pending',
                              })
                            }
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <h4 className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {task.title}
                          </h4>
                          <FaExclamationTriangle className={`w-4 h-4 ${getPriorityColor(task.priority)}`} />
                        </div>

                        {task.description && (
                          <p className="text-gray-600 text-sm mb-2">{task.description}</p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className={`px-2 py-1 rounded-full ${getTaskStatusColor(task.status)}`}>
                            {task.status === 'completed' && 'Terminée'}
                            {task.status === 'in-progress' && 'En cours'}
                            {task.status === 'pending' && 'En attente'}
                          </span>

                          {task.assignedTo && (
                            <div className="flex items-center gap-1">
                              <FaUser className="w-3 h-3" />
                              <span>{task.assignedTo}</span>
                            </div>
                          )}

                          {task.dueDate && (
                            <span>Échéance: {new Date(task.dueDate).toLocaleDateString('fr-FR')}</span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="p-1 text-red-500 hover:text-red-700 transition-colors"
                        title="Supprimer la tâche"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transcript Preview */}
          {meeting.transcript.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Transcription récente</h3>
              <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                <div className="space-y-2">
                  {meeting.transcript.slice(-5).map((segment, index) => (
                    <div key={segment.id || index} className="text-sm">
                      <span className="font-medium text-gray-700">{segment.speaker}:</span>
                      <span className="text-gray-600 ml-2">{segment.text}</span>
                      <span className="text-xs text-gray-400 ml-2">({segment.time})</span>
                    </div>
                  ))}
                </div>
                {meeting.transcript.length > 5 && (
                  <p className="text-xs text-gray-500 mt-2">
                    ... et {meeting.transcript.length - 5} autres segments
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Google Meet Link */}
          {meeting.googleMeetUrl && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Lien Google Meet</h3>
              <a
                href={meeting.googleMeetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ouvrir Google Meet
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};