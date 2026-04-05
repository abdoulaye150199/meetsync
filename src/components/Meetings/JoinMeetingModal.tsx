import React from 'react';
import { FaTimes, FaSignInAlt, FaIdBadge } from 'react-icons/fa';

interface JoinMeetingModalProps {
  joinCode: string;
  joinError: string | null;
  onJoinCodeChange: (code: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export const JoinMeetingModal: React.FC<JoinMeetingModalProps> = ({
  joinCode,
  joinError,
  onJoinCodeChange,
  onSubmit,
  onClose,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Rejoindre une réunion</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {joinError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {joinError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaIdBadge className="inline w-4 h-4 mr-2" />
              Code de la réunion *
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => onJoinCodeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Entrez le code de la réunion"
              required
              autoFocus
            />
            <p className="text-sm text-gray-500 mt-2">
              Demandez le code de réunion à l'organisateur
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <FaSignInAlt className="w-4 h-4" />
              Rejoindre
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};