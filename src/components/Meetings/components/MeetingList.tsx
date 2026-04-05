import { useMemo } from 'react';
import {
  FiCalendar,
  FiClock,
  FiVideo,
  FiUsers,
  FiPlay,
  FiEdit2,
  FiXCircle,
  FiPlus,
  FiSearch,
} from 'react-icons/fi';
import type { Meeting, MeetingFilter } from '../types';

interface MeetingListProps {
  meetings: Meeting[];
  filter: MeetingFilter;
  query: string;
  selectedId: string | null;
  onFilterChange: (filter: MeetingFilter) => void;
  onQueryChange: (query: string) => void;
  onSelectMeeting: (id: string) => void;
  onStartMeeting: (id: string) => void;
  onJoinMeeting: (id: string) => void;
  onEditMeeting: (meeting: Meeting) => void;
  onCancelMeeting: (id: string) => void;
  onDuplicateMeeting: (meeting: Meeting) => void;
}

const filterLabels: Record<MeetingFilter, string> = {
  all: 'Toutes',
  upcoming: 'A venir',
  live: 'En cours',
  past: 'Passees',
  canceled: 'Annulees',
};

const statusStyles = {
  scheduled: 'bg-blue-50 text-blue-700 border border-blue-100',
  live: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  completed: 'bg-gray-50 text-gray-700 border border-gray-100',
  canceled: 'bg-red-50 text-red-700 border border-red-100',
};

const statusLabels = {
  scheduled: 'Planifiee',
  live: 'En cours',
  completed: 'Terminee',
  canceled: 'Annulee',
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
};

const formatDateLabel = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return "Aujourd'hui";
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'Demain';
  }

  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
};

const getMeetingTimestamp = (meeting: Meeting) => {
  try {
    const dateTime = new Date(`${meeting.date}T${meeting.time}`);
    return dateTime.getTime();
  } catch {
    return null;
  }
};

export const MeetingList = ({
  meetings,
  filter,
  query,
  selectedId,
  onFilterChange,
  onQueryChange,
  onSelectMeeting,
  onStartMeeting,
  onJoinMeeting,
  onEditMeeting,
  onCancelMeeting,
  onDuplicateMeeting,
}: MeetingListProps) => {
  const stats = useMemo(() => {
    const nowTs = new Date().getTime();
    const upcoming = meetings.filter((meeting) => {
      if (meeting.status !== 'scheduled') return false;
      const ts = getMeetingTimestamp(meeting);
      return ts !== null && ts >= nowTs;
    }).length;

    const live = meetings.filter((meeting) => meeting.status === 'live').length;

    const past = meetings.filter((meeting) => {
      if (meeting.status === 'completed') return true;
      if (meeting.status !== 'scheduled') return false;
      const ts = getMeetingTimestamp(meeting);
      return ts !== null && ts < nowTs;
    }).length;

    const canceled = meetings.filter((meeting) => meeting.status === 'canceled').length;

    return { upcoming, live, past, canceled };
  }, [meetings]);

  const filteredMeetings = useMemo(() => {
    const nowTs = new Date().getTime();
    const normalizedQuery = query.trim().toLowerCase();

    const matchesFilter = (meeting: Meeting) => {
      const ts = getMeetingTimestamp(meeting);

      switch (filter) {
        case 'upcoming':
          return meeting.status === 'scheduled' && ts !== null && ts >= nowTs;
        case 'live':
          return meeting.status === 'live';
        case 'past':
          return (
            meeting.status === 'completed' ||
            (meeting.status === 'scheduled' && ts !== null && ts < nowTs)
          );
        case 'canceled':
          return meeting.status === 'canceled';
        case 'all':
        default:
          return true;
      }
    };

    const matchesQuery = (meeting: Meeting) => {
      if (!normalizedQuery) return true;
      return (
        meeting.title.toLowerCase().includes(normalizedQuery) ||
        meeting.description.toLowerCase().includes(normalizedQuery) ||
        meeting.participants.some((p) => p.toLowerCase().includes(normalizedQuery)) ||
        meeting.meetingCode.toLowerCase().includes(normalizedQuery)
      );
    };

    return meetings.filter((meeting) => matchesFilter(meeting) && matchesQuery(meeting));
  }, [meetings, filter, query]);

  const selectedMeeting = meetings.find((meeting) => meeting.id === selectedId);

  return (
    <div className="flex-1 flex flex-col min-h-0 p-6 space-y-6">
      {/* Stats */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Aperçu des reunions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-white/70 text-xs">A venir</p>
            <p className="text-xl font-bold">{stats.upcoming}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-white/70 text-xs">En cours</p>
            <p className="text-xl font-bold">{stats.live}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-white/70 text-xs">Passees</p>
            <p className="text-xl font-bold">{stats.past}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-white/70 text-xs">Annulees</p>
            <p className="text-xl font-bold">{stats.canceled}</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
          <FiSearch className="text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Rechercher une reunion, un participant, un code..."
            className="flex-1 outline-none text-sm text-gray-700"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(filterLabels).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => onFilterChange(key as MeetingFilter)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition ${
                filter === key
                  ? 'bg-[#01333D] text-white border-[#01333D]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#01333D]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Meeting List */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="flex flex-col min-h-0 xl:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-800">Vos reunions</h3>
            <span className="text-xs text-gray-500">
              {filteredMeetings.length} resultat
              {filteredMeetings.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {filteredMeetings.map((meeting) => (
              <div
                key={meeting.id}
                onClick={() => onSelectMeeting(meeting.id)}
                className={`bg-white border rounded-2xl p-4 cursor-pointer transition hover:shadow-sm ${
                  selectedMeeting?.id === meeting.id
                    ? 'border-[#01333D] shadow-sm'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800">{meeting.title}</h4>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <FiCalendar size={13} />
                        {formatDateLabel(meeting.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <FiClock size={13} />
                        {meeting.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <FiVideo size={13} />
                        {meeting.durationMinutes} min
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        statusStyles[meeting.status]
                      }`}
                    >
                      {statusLabels[meeting.status]}
                    </span>
                    {meeting.provider === 'google' && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        Google Meet
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FiUsers className="text-gray-400" size={16} />
                    <div className="flex -space-x-2">
                      {meeting.participants.slice(0, 3).map((participant) => (
                        <div
                          key={participant}
                          className="w-8 h-8 rounded-full bg-[#01333D] text-white text-xs font-semibold flex items-center justify-center border-2 border-white"
                        >
                          {getInitials(participant)}
                        </div>
                      ))}
                      {meeting.participants.length === 0 && (
                        <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 text-xs font-semibold flex items-center justify-center border-2 border-white">
                          --
                        </div>
                      )}
                      {meeting.participants.length > 3 && (
                        <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold flex items-center justify-center border-2 border-white">
                          +{meeting.participants.length - 3}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {meeting.participants.length} participant
                      {meeting.participants.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {meeting.status === 'scheduled' && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onStartMeeting(meeting.id);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#01333D] text-white text-xs font-semibold hover:bg-opacity-90 transition flex items-center gap-1"
                      >
                        <FiPlay size={12} />
                        Demarrer
                      </button>
                    )}
                    {meeting.status === 'live' && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onJoinMeeting(meeting.id);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition flex items-center gap-1"
                      >
                        <FiVideo size={12} />
                        Rejoindre
                      </button>
                    )}
                    {(meeting.status === 'completed' || meeting.status === 'canceled') && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDuplicateMeeting(meeting);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition flex items-center gap-1"
                      >
                        <FiPlus size={12} />
                        Replanifier
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEditMeeting(meeting);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:border-[#01333D] transition flex items-center gap-1"
                    >
                      <FiEdit2 size={12} />
                      Modifier
                    </button>
                    {(meeting.status === 'scheduled' || meeting.status === 'live') && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onCancelMeeting(meeting.id);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition flex items-center gap-1"
                      >
                        <FiXCircle size={12} />
                        Annuler
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
