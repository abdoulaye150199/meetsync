import React from 'react';
import { FaTimes, FaSave, FaCalendarAlt, FaClock, FaUsers, FaIdBadge } from 'react-icons/fa';
import type { MeetingFormState } from './types';

interface MeetingFormModalProps {
  mode: 'create' | 'edit';
  formState: MeetingFormState;
  formError: string | null;
  isSaving: boolean;
  onFormStateChange: (state: MeetingFormState) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export const MeetingFormModal: React.FC<MeetingFormModalProps> = ({
  mode,
  formState,
  formError,
  isSaving,
  onFormStateChange,
  onSubmit,
  onClose,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const handleParticipantChange = (index: number, value: string) => {
    const newParticipants = [...formState.participants];
    newParticipants[index] = value;
    onFormStateChange({ ...formState, participants: newParticipants });
  };

  const addParticipant = () => {
    onFormStateChange({
      ...formState,
      participants: [...formState.participants, ''],
    });
  };

  const removeParticipant = (index: number) => {
    const newParticipants = formState.participants.filter((_, i) => i !== index);
    onFormStateChange({ ...formState, participants: newParticipants });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'create' ? 'Créer une réunion' : 'Modifier la réunion'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titre *
            </label>
            <input
              type="text"
              value={formState.title}
              onChange={(e) => onFormStateChange({ ...formState, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Titre de la réunion"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formState.description}
              onChange={(e) => onFormStateChange({ ...formState, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Description de la réunion"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaCalendarAlt className="inline w-4 h-4 mr-2" />
                Date *
              </label>
              <input
                type="date"
                value={formState.date}
                onChange={(e) => onFormStateChange({ ...formState, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaClock className="inline w-4 h-4 mr-2" />
                Heure *
              </label>
              <input
                type="time"
                value={formState.time}
                onChange={(e) => onFormStateChange({ ...formState, time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Durée (minutes)
              </label>
              <input
                type="number"
                value={formState.duration}
                onChange={(e) => onFormStateChange({ ...formState, duration: parseInt(e.target.value) || 60 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="15"
                max="480"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaIdBadge className="inline w-4 h-4 mr-2" />
                Code de salle
              </label>
              <input
                type="text"
                value={formState.roomId}
                onChange={(e) => onFormStateChange({ ...formState, roomId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Laisser vide pour générer automatiquement"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaUsers className="inline w-4 h-4 mr-2" />
              Participants
            </label>
            <div className="space-y-2">
              {formState.participants.map((participant, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="email"
                    value={participant}
                    onChange={(e) => handleParticipantChange(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="email@exemple.com"
                  />
                  {formState.participants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeParticipant(index)}
                      className="p-2 text-red-500 hover:text-red-700 transition-colors"
                    >
                      <FaTimes className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addParticipant}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                + Ajouter un participant
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formState.isRecurring}
                onChange={(e) => onFormStateChange({ ...formState, isRecurring: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Récurrente</span>
            </label>

            {formState.isRecurring && (
              <select
                value={formState.recurrencePattern}
                onChange={(e) =>
                  onFormStateChange({
                    ...formState,
                    recurrencePattern: e.target.value as MeetingFormState['recurrencePattern'],
                  })
                }
                className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="daily">Quotidienne</option>
                <option value="weekly">Hebdomadaire</option>
                <option value="monthly">Mensuelle</option>
              </select>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={isSaving}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <FaSave className="w-4 h-4" />
              {isSaving ? 'Sauvegarde...' : mode === 'create' ? 'Créer' : 'Modifier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
