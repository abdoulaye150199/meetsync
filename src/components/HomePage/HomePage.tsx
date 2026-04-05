import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FiChevronRight,
  FiMessageSquare,
  FiCircle,
  FiClock,
  FiCalendar,
  FiSearch,
  FiSettings,
  FiLogOut,
  FiList,
  FiGrid,
  FiUsers,
  FiBell,
  FiUser,
} from 'react-icons/fi';
import { IoHomeOutline, IoChatbubblesOutline } from 'react-icons/io5';
import { MdChecklistRtl } from 'react-icons/md';
import { MeetingManager } from '../Meetings';
import { TasksManager } from '../Tasks';
import { ChatPanel } from '../Chat';
import { meetingService } from '../../services/meetingService';
import { taskService } from '../../services/taskService';
import { useRealtimeChat } from '../../hooks/useRealtimeChat';
import type { ChatMessage, ChatUser, Contact } from '../../types/chat';
import type { Meeting, Task } from '../Meetings/types';
import { apiService } from '../../services/api';

const CURRENT_USER_ID = 'me';
const PROFILE_OVERRIDE_STORAGE_KEY = 'meetsync.profile.override';
const DEFAULT_PROFILE_AVATAR = 'https://i.pravatar.cc/40?u=meetsync-user';

const minutesAgo = (value: number) => new Date(Date.now() - value * 60000).toISOString();

const contactsSeed: Contact[] = [];

const seedMessages: Record<string, ChatMessage[]> = {
  '1': [
    {
      id: 'm1-1',
      conversationId: '1',
      senderId: '1',
      text: 'On garde le point de 10h pour le sprint planning ?',
      createdAt: minutesAgo(220),
      status: 'read',
    },
    {
      id: 'm1-2',
      conversationId: '1',
      senderId: CURRENT_USER_ID,
      text: "Oui, c'est bon pour moi. Je partage l'agenda.",
      createdAt: minutesAgo(215),
      status: 'read',
    },
  ],
  '2': [
    {
      id: 'm2-1',
      conversationId: '2',
      senderId: '2',
      text: 'Les nouveaux wireframes sont prets pour validation.',
      createdAt: minutesAgo(140),
      status: 'read',
    },
    {
      id: 'm2-2',
      conversationId: '2',
      senderId: CURRENT_USER_ID,
      text: 'Parfait, on regarde ca en revue cet apres-midi.',
      createdAt: minutesAgo(132),
      status: 'read',
    },
  ],
  '3': [
    {
      id: 'm3-1',
      conversationId: '3',
      senderId: '3',
      text: 'Le build staging est dispo avec les correctifs.',
      createdAt: minutesAgo(90),
      status: 'delivered',
    },
    {
      id: 'm3-2',
      conversationId: '3',
      senderId: CURRENT_USER_ID,
      text: 'Top, je fais un check et je reviens vers toi.',
      createdAt: minutesAgo(85),
      status: 'delivered',
    },
  ],
  '4': [
    {
      id: 'm4-1',
      conversationId: '4',
      senderId: '4',
      text: "J'ai liste trois points QA urgents a traiter.",
      createdAt: minutesAgo(60),
      status: 'sent',
    },
  ],
  '5': [
    {
      id: 'm5-1',
      conversationId: '5',
      senderId: '5',
      text: 'Le rapport temps/reunions est pret pour demain.',
      createdAt: minutesAgo(30),
      status: 'read',
    },
  ],
};

const decodeUserFromToken = (): ChatUser | null => {
  if (typeof window === 'undefined') return null;
  const token = window.localStorage.getItem('token');
  if (!token) return null;

  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return null;

    const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const payload = JSON.parse(window.atob(padded)) as { sub?: string; email?: string };

    if (!payload.sub) return null;
    const displayName = payload.email?.split('@')[0] || 'Vous';
    const avatarKey = payload.email ?? payload.sub;

    return {
      id: payload.sub,
      name: displayName,
      avatar: `https://i.pravatar.cc/40?u=${encodeURIComponent(avatarKey)}`,
    };
  } catch {
    return null;
  }
};

const readProfileOverride = (): Partial<Pick<ChatUser, 'name' | 'avatar'>> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PROFILE_OVERRIDE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { name?: unknown; avatar?: unknown };
    return {
      name: typeof parsed.name === 'string' ? parsed.name : undefined,
      avatar: typeof parsed.avatar === 'string' ? parsed.avatar : undefined,
    };
  } catch {
    return {};
  }
};

const applyProfileOverride = (user: ChatUser | null): ChatUser | null => {
  if (!user) return user;
  const override = readProfileOverride();
  return {
    ...user,
    name: override.name?.trim() ? override.name.trim() : user.name,
    avatar: override.avatar?.trim() ? override.avatar.trim() : user.avatar,
  };
};

const formatNotificationDate = (value: Date) => {
  return value.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const HomePage = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [currentUserState, setCurrentUserState] = useState<ChatUser | null>(null);
  const [selectedUserIdState, setSelectedUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [activeSection, setActiveSection] = useState<'meetings' | 'chat' | 'tasks'>('meetings');
  const [plannerRequestId, setPlannerRequestId] = useState(0);
  const [pendingCall, setPendingCall] = useState<{ contactId: string; type: 'video' } | null>(null);
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);
  const [profileNameDraft, setProfileNameDraft] = useState('');
  const [profileAvatarDraft, setProfileAvatarDraft] = useState(DEFAULT_PROFILE_AVATAR);
  const [profileEditorError, setProfileEditorError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<'online' | 'unavailable'>('online');
  const [notificationsPaused, setNotificationsPaused] = useState(false);
  const [meetingNotificationsSource, setMeetingNotificationsSource] = useState<Meeting[]>([]);
  const [taskNotificationsSource, setTaskNotificationsSource] = useState<Task[]>([]);
  const notificationsMenuRef = useRef<HTMLDivElement | null>(null);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);

  const [contactsState, setContactsState] = useState<Contact[]>(contactsSeed);
  const visibleContacts = useMemo(
    () => contactsState.filter((contact) => contact.id !== currentUserState?.id),
    [contactsState, currentUserState?.id],
  );
  const selectedUserId = useMemo(() => {
    if (visibleContacts.length === 0) return null;
    if (selectedUserIdState && visibleContacts.some((contact) => contact.id === selectedUserIdState)) {
      return selectedUserIdState;
    }
    return visibleContacts[0].id;
  }, [selectedUserIdState, visibleContacts]);

  useEffect(() => {
    let mounted = true;
    ;(async () => {
      try {
        const resp = await apiService.get<{ id: string; nom: string; email: string }[]>('/utilisateurs');
        if (resp.error) {
          // fallback to empty contacts
          setContactsState(contactsSeed);
          return;
        }
        const users = (resp.data || []).map((u) => ({
          id: u.id,
          name: u.nom,
          status: 'offline' as const,
          avatar: `https://i.pravatar.cc/40?u=${encodeURIComponent(u.email ?? u.id)}`,
          role: '',
        }));
        if (mounted) {
          setContactsState(users);
          if (users.length > 0) {
            setSelectedUserId((prev) => prev ?? users[0].id);
          }
        }
      } catch {
        setContactsState(contactsSeed);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [])

  useEffect(() => {
    let mounted = true;
    ;(async () => {
      try {
        const resp = await apiService.get<
          { id: string; nom: string; email: string } |
          { data?: { utilisateur?: { id: string; nom: string; email: string } } }
        >('/auth/profile');
        if (!mounted) return;
        if (resp.error || !resp.data) {
          setCurrentUserState(applyProfileOverride(decodeUserFromToken()));
          return;
        }
        const normalized = 'id' in resp.data
          ? resp.data
          : resp.data.data?.utilisateur;

        if (!normalized?.id) {
          setCurrentUserState(applyProfileOverride(decodeUserFromToken()));
          return;
        }

        const u = normalized;
        setCurrentUserState(applyProfileOverride({
          id: u.id,
          name: u.nom ?? u.email?.split('@')[0] ?? 'Vous',
          avatar: `https://i.pravatar.cc/40?u=${encodeURIComponent(u.email ?? u.id)}`,
        }));
      } catch {
        setCurrentUserState(applyProfileOverride(decodeUserFromToken()));
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadNotificationSources = async () => {
      const [meetingsResult, tasksResult] = await Promise.allSettled([
        meetingService.getAll(),
        taskService.getAll(),
      ]);

      if (!mounted) return;

      if (meetingsResult.status === 'fulfilled') {
        setMeetingNotificationsSource(meetingsResult.value);
      }
      if (tasksResult.status === 'fulfilled') {
        setTaskNotificationsSource(tasksResult.value);
      }
    };

    void loadNotificationSources();
    const refreshTimer = window.setInterval(() => {
      void loadNotificationSources();
    }, 60000);

    return () => {
      mounted = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  const {
    connectionState,
    messagesByConversation,
    sendMessage,
    setTyping,
    typingByConversation,
    presenceByUser,
    markConversationRead,
    unreadCounts,
  } = useRealtimeChat({
    currentUser: currentUserState ?? { id: '', name: 'Vous', avatar: 'https://i.pravatar.cc/40?u=meetsync-user' },
    contacts: visibleContacts,
    seedMessages,
  });

  const selectedContact = visibleContacts.find((contact) => contact.id === selectedUserId) ?? null;

  useEffect(() => {
    if (!selectedUserId) return;
    markConversationRead(selectedUserId);
  }, [markConversationRead, selectedUserId]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        settingsMenuRef.current &&
        !settingsMenuRef.current.contains(event.target as Node)
      ) {
        setIsSettingsMenuOpen(false);
      }
      if (
        notificationsMenuRef.current &&
        !notificationsMenuRef.current.contains(event.target as Node)
      ) {
        setIsNotificationMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const conversationSummaries = visibleContacts
    .map((contact) => {
      const list = messagesByConversation[contact.id] ?? [];
      const lastMessage = list[list.length - 1];
      return {
        contact,
        lastMessage,
        unread: unreadCounts[contact.id] ?? 0,
      };
    })
    .sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });

  const messageNotifications = useMemo(() => {
    return conversationSummaries
      .filter(({ unread }) => unread > 0)
      .map(({ contact, lastMessage, unread }) => ({
        id: `msg-${contact.id}`,
        contactName: contact.name,
        unread,
        preview: lastMessage?.text || 'Nouveaux messages',
        timestamp: lastMessage?.createdAt ? new Date(lastMessage.createdAt) : new Date(),
      }));
  }, [conversationSummaries]);

  const taskDueNotifications = useMemo(() => {
    const now = new Date();
    const next3Days = now.getTime() + 3 * 24 * 60 * 60 * 1000;

    return taskNotificationsSource
      .filter((task) => task.status !== 'completed' && task.status !== 'done' && task.dueDate)
      .map((task) => {
        const dueDate = new Date(`${task.dueDate}T23:59:59`);
        return { task, dueDate };
      })
      .filter(({ dueDate }) => !Number.isNaN(dueDate.getTime()))
      .filter(({ dueDate }) => dueDate.getTime() >= now.getTime() && dueDate.getTime() <= next3Days)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .map(({ task, dueDate }) => ({
        id: `task-${task.id}`,
        title: task.title,
        dueDate,
      }));
  }, [taskNotificationsSource]);

  const meetingDueNotifications = useMemo(() => {
    const now = new Date();
    const next24Hours = now.getTime() + 24 * 60 * 60 * 1000;

    return meetingNotificationsSource
      .filter((meeting) => meeting.status === 'scheduled')
      .map((meeting) => {
        const start = new Date(`${meeting.date}T${meeting.time}:00`);
        return { meeting, start };
      })
      .filter(({ start }) => !Number.isNaN(start.getTime()))
      .filter(({ start }) => start.getTime() >= now.getTime() && start.getTime() <= next24Hours)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .map(({ meeting, start }) => ({
        id: `meeting-${meeting.id}`,
        title: meeting.title,
        start,
      }));
  }, [meetingNotificationsSource]);

  const totalNotifications = notificationsPaused
    ? 0
    : messageNotifications.length + taskDueNotifications.length + meetingDueNotifications.length;

  const formatPreviewTime = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const handleSendMessage = (text: string) => {
    if (!selectedUserId) return;
    sendMessage(selectedUserId, text);
  };

  const handleTyping = (isTyping: boolean) => {
    if (!selectedUserId) return;
    setTyping(selectedUserId, isTyping);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleStartVideoCall = () => {
    if (!selectedUserId) return;
    setPendingCall({ contactId: selectedUserId, type: 'video' });
    setActiveSection('meetings');
  };

  const handleOpenProfileEditor = () => {
    setProfileNameDraft(currentUserState?.name ?? '');
    setProfileAvatarDraft(currentUserState?.avatar ?? DEFAULT_PROFILE_AVATAR);
    setProfileEditorError(null);
    setIsSettingsMenuOpen(false);
    setIsProfileEditorOpen(true);
  };

  const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfileEditorError('Veuillez sélectionner une image valide.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        setProfileEditorError("Impossible de lire l'image.");
        return;
      }
      setProfileEditorError(null);
      setProfileAvatarDraft(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = () => {
    const trimmedName = profileNameDraft.trim();
    if (!trimmedName) {
      setProfileEditorError('Le nom est requis.');
      return;
    }
    setCurrentUserState((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        name: trimmedName,
        avatar: profileAvatarDraft || previous.avatar,
      };
    });
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        PROFILE_OVERRIDE_STORAGE_KEY,
        JSON.stringify({
          name: trimmedName,
          avatar: profileAvatarDraft,
        }),
      );
    }
    setIsProfileEditorOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden animate-fadeIn">
      {/* Sidebar */}
      <aside className="w-72 bg-[#01333D] text-white flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <h1 className="font-logo text-2xl tracking-wider">MEET SYNC</h1>
        </div>

        {/* Search and Filters */}
        <div className="p-4 flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 focus-within:bg-white/20 transition">
            <FiSearch className="text-white/70" size={18} />
            <input
              type="text"
              placeholder="Rechercher..."
              className="flex-1 bg-transparent outline-none text-sm text-white placeholder-white/50"
            />
          </div>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-white/20 text-white' : 'text-white hover:bg-white/10'}`}
          >
            <FiList size={18} />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-white/20 text-white' : 'text-white hover:bg-white/10'}`}
          >
            <FiGrid size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-4 py-4 space-y-2">
          <button
            onClick={() => setActiveSection('meetings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition ${
              activeSection === 'meetings'
                ? 'bg-white/10 text-white'
                : 'text-white/70 hover:bg-white/10'
            }`}
          >
            <IoHomeOutline size={20} />
            <span>Reunions</span>
          </button>

          <button
            onClick={() => setActiveSection('chat')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition ${
              activeSection === 'chat'
                ? 'bg-white/10 text-white'
                : 'text-white/70 hover:bg-white/10'
            }`}
          >
            <IoChatbubblesOutline size={20} />
            <span>Discussions</span>
          </button>

          <button
            onClick={() => setActiveSection('tasks')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition ${
              activeSection === 'tasks'
                ? 'bg-white/10 text-white'
                : 'text-white/70 hover:bg-white/10'
            }`}
          >
            <MdChecklistRtl size={20} />
            <span>Taches</span>
          </button>
        </nav>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {conversationSummaries.map(({ contact, lastMessage, unread }) => {
            const presence = presenceByUser[contact.id] ?? contact.status;
            return (
              <button
                key={contact.id}
                onClick={() => {
                  setSelectedUserId(contact.id);
                  setActiveSection('chat');
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                  selectedUserId === contact.id
                    ? 'bg-white/15'
                    : 'hover:bg-white/10'
                }`}
              >
                <div className="relative">
                  <img
                    src={contact.avatar}
                    alt={contact.name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#01333D] ${
                      presence === 'online'
                        ? 'bg-green-500'
                        : presence === 'away'
                        ? 'bg-yellow-500'
                        : 'bg-gray-500'
                    }`}
                  />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-white truncate">{contact.name}</p>
                    {lastMessage && (
                      <span className="text-[10px] text-white/60">
                        {formatPreviewTime(lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/60 truncate">
                    {lastMessage?.text ?? 'Aucun message pour le moment'}
                  </p>
                </div>
                {unread > 0 && (
                  <span className="ml-auto text-[10px] font-semibold bg-white text-[#01333D] rounded-full px-2 py-1">
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Logout */}
        <div className="border-t border-white/10 px-4 py-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition font-medium"
          >
            <FiLogOut size={20} />
            <span>Deconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col ml-8 mr-8">
        {/* Top Header */}
        <header className="flex items-center justify-between border-b border-white/10 bg-[#01333D] px-6 h-14">
          {/* Left Side */}
          <div className="flex items-center gap-3">
            <button
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
              title="Equipes"
            >
              <FiUsers size={20} />
            </button>
            <button
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
              title="Applications"
            >
              <FiGrid size={20} />
            </button>
            <div className="relative" ref={notificationsMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsNotificationMenuOpen((prev) => !prev);
                  setIsSettingsMenuOpen(false);
                }}
                className="relative p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
                title="Notifications"
              >
                <FiBell size={20} />
                {!notificationsPaused && totalNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                    {totalNotifications > 99 ? '99+' : totalNotifications}
                  </span>
                )}
              </button>
              {isNotificationMenuOpen && (
                <div className="absolute left-0 mt-2 w-[26rem] rounded-xl bg-white shadow-2xl border border-gray-200 text-gray-800 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <p className="font-semibold">Notifications</p>
                    {notificationsPaused && (
                      <span className="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                        Suspendues
                      </span>
                    )}
                  </div>
                  {notificationsPaused ? (
                    <div className="px-4 py-6 text-sm text-gray-500">
                      Les notifications sont suspendues dans Paramètres.
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-2">
                          <FiMessageSquare size={13} />
                          Messages
                        </p>
                        {messageNotifications.length === 0 ? (
                          <p className="text-sm text-gray-500">Aucun nouveau message.</p>
                        ) : (
                          <div className="space-y-2">
                            {messageNotifications.map((item) => (
                              <div key={item.id} className="rounded-lg border border-gray-100 px-3 py-2">
                                <p className="text-sm font-medium">
                                  {item.contactName} ({item.unread})
                                </p>
                                <p className="text-xs text-gray-600 truncate">{item.preview}</p>
                                <p className="text-[11px] text-gray-400 mt-1">
                                  {formatNotificationDate(item.timestamp)}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-2">
                          <FiClock size={13} />
                          Tâches proches
                        </p>
                        {taskDueNotifications.length === 0 ? (
                          <p className="text-sm text-gray-500">Aucune tâche proche.</p>
                        ) : (
                          <div className="space-y-2">
                            {taskDueNotifications.map((item) => (
                              <div key={item.id} className="rounded-lg border border-gray-100 px-3 py-2">
                                <p className="text-sm font-medium">{item.title}</p>
                                <p className="text-[11px] text-gray-400 mt-1">
                                  Échéance: {formatNotificationDate(item.dueDate)}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-2">
                          <FiCalendar size={13} />
                          Réunions proches
                        </p>
                        {meetingDueNotifications.length === 0 ? (
                          <p className="text-sm text-gray-500">Aucune réunion proche.</p>
                        ) : (
                          <div className="space-y-2">
                            {meetingDueNotifications.map((item) => (
                              <div key={item.id} className="rounded-lg border border-gray-100 px-3 py-2">
                                <p className="text-sm font-medium">{item.title}</p>
                                <p className="text-[11px] text-gray-400 mt-1">
                                  Début: {formatNotificationDate(item.start)}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                setActiveSection('tasks');
                setPlannerRequestId((prev) => prev + 1);
              }}
              className="px-4 py-2 rounded-lg border border-white/30 text-white text-sm font-semibold hover:bg-white/10 transition"
            >
              Planning
            </button>
            <div className="relative" ref={settingsMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsSettingsMenuOpen((prev) => !prev);
                  setIsNotificationMenuOpen(false);
                }}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
                title="Paramètres"
              >
                <FiSettings size={20} />
              </button>
              {isSettingsMenuOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white shadow-2xl border border-gray-200 text-gray-800 z-50 overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                      <img
                        src={
                          currentUserState?.avatar ||
                          DEFAULT_PROFILE_AVATAR
                        }
                        alt={currentUserState?.name || 'Utilisateur'}
                        className="w-12 h-12 rounded-full"
                      />
                      <div>
                        <p className="font-semibold leading-tight">
                          {currentUserState?.name || 'Utilisateur'}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                          <FiCircle
                            size={10}
                            className={
                              availability === 'online'
                                ? 'text-emerald-500'
                                : 'text-amber-500'
                            }
                          />
                          {availability === 'online' ? 'Disponible' : 'Non disponible'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition text-gray-600"
                    >
                      Mettez à jour votre statut
                    </button>
                  </div>

                  <div className="py-1 border-b border-gray-100">
                    <button
                      type="button"
                      onClick={() =>
                        setAvailability((prev) =>
                          prev === 'online' ? 'unavailable' : 'online',
                        )
                      }
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition text-left"
                    >
                      <span className="flex items-center gap-2">
                        <FiClock size={15} />
                        Me signaler non disponible
                      </span>
                      <span className="text-xs text-gray-500">
                        {availability === 'unavailable' ? 'Actif' : 'Inactif'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setNotificationsPaused((prev) => !prev)
                      }
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition text-left"
                    >
                      <span className="flex items-center gap-2">
                        <FiCircle size={15} />
                        Suspendre les notifications
                      </span>
                      <span className="flex items-center gap-1 text-sm text-gray-600">
                        {notificationsPaused ? 'Désactiver' : 'Activer'}
                        <FiChevronRight size={14} />
                      </span>
                    </button>
                  </div>

                  <div className="py-1 border-b border-gray-100">
                    <button
                      type="button"
                      onClick={handleOpenProfileEditor}
                      className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition text-left"
                    >
                      <FiUser size={15} />
                      Profil
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-3 text-left text-red-600 hover:bg-red-50 transition"
                  >
                    <FiLogOut size={15} />
                    Se déconnecter de Meet Sync
                  </button>
                </div>
              )}
            </div>
            <img
              src={currentUserState?.avatar || DEFAULT_PROFILE_AVATAR}
              alt="Profile"
              className="w-9 h-9 rounded-full border border-white/20 cursor-pointer hover:opacity-80 transition"
            />
          </div>
        </header>

        {isProfileEditorOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Modifier le profil</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Changez votre photo et votre nom affiché.
                </p>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center gap-4">
                  <img
                    src={profileAvatarDraft || DEFAULT_PROFILE_AVATAR}
                    alt="Aperçu profil"
                    className="w-16 h-16 rounded-full border border-gray-200 object-cover"
                  />
                  <label className="inline-flex items-center px-3 py-2 rounded-lg bg-gray-100 text-sm font-medium text-gray-700 hover:bg-gray-200 cursor-pointer transition">
                    Changer la photo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input
                    type="text"
                    value={profileNameDraft}
                    onChange={(event) => setProfileNameDraft(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#01333D]/20 focus:border-[#01333D]"
                    placeholder="Votre nom"
                  />
                </div>

                {profileEditorError && (
                  <p className="text-sm text-red-600">{profileEditorError}</p>
                )}
              </div>

              <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProfileEditorOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="px-4 py-2 rounded-lg bg-[#01333D] text-sm font-semibold text-white hover:opacity-90 transition"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Area */}
        <main className="flex-1 px-8 pt-6 pb-8 bg-gray-50 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setActiveSection('meetings')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  activeSection === 'meetings'
                    ? 'bg-[#01333D] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Reunions
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('chat')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  activeSection === 'chat'
                    ? 'bg-[#01333D] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Discussions
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('tasks')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  activeSection === 'tasks'
                    ? 'bg-[#01333D] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Taches
              </button>
            </div>
            <span className="text-sm text-gray-500">
              {activeSection === 'meetings'
                ? 'Pilotez toutes vos reunions au meme endroit.'
                : activeSection === 'tasks'
                ? 'Gerez vos taches quotidiennes et planifiez votre journee.'
                : 'Retrouvez vos messages et discussions.'}
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {activeSection === 'meetings' ? (
              <MeetingManager
                plannerRequestId={plannerRequestId}
                pendingCall={pendingCall}
                onCallStarted={() => setPendingCall(null)}
              />
            ) : activeSection === 'tasks' ? (
              <TasksManager plannerRequestId={plannerRequestId} />
            ) : (
              <ChatPanel
                currentUser={currentUserState ?? { id: '', name: 'Vous', avatar: 'https://i.pravatar.cc/40?u=meetsync-user' }}
                contact={selectedContact}
                messages={
                  selectedUserId ? messagesByConversation[selectedUserId] ?? [] : []
                }
                presence={
                  selectedUserId
                    ? presenceByUser[selectedUserId] ?? selectedContact?.status
                    : undefined
                }
                connectionState={connectionState}
                typing={selectedUserId ? typingByConversation[selectedUserId] : null}
                onSendMessage={handleSendMessage}
                onTyping={handleTyping}
                onStartVideoCall={handleStartVideoCall}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default HomePage;
