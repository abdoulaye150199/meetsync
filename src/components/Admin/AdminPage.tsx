import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FiActivity,
  FiBarChart2,
  FiClock,
  FiFilter,
  FiLogOut,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiUsers,
  FiTrash2,
  FiLock,
  FiUnlock,
  FiMoreVertical,
  FiArrowRight,
} from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { apiService } from '../../services/api'

type AdminViewState = 'checking' | 'login' | 'forbidden' | 'ready'
type UserRoleFilter = 'ALL' | 'ADMIN' | 'HOTE' | 'PARTICIPANT'

const isUserRoleFilter = (value: string): value is UserRoleFilter =>
  value === 'ALL' || value === 'ADMIN' || value === 'HOTE' || value === 'PARTICIPANT'

interface AdminUser {
  id: string
  nom: string
  email: string
  role: string
}

interface UserRecord extends AdminUser {
  creeA: string
}

interface AdminOverview {
  users: {
    total: number
    admins: number
    hosts: number
    participants: number
  }
  meetings: {
    total: number
    live: number
    scheduled: number
    completed: number
  }
  tasks: {
    total: number
    pending: number
    inProgress: number
    completed: number
  }
  recentUsers: UserRecord[]
}

const defaultCredentials = {
  email: 'admin@meetSync.com',
  password: 'admin@1234',
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

const StatCard = ({
  title,
  value,
  icon,
}: {
  title: string
  value: string
  icon: React.ReactNode
}) => (
  <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      </div>
      <div className="rounded-lg bg-[#01333D] p-3 text-white text-lg">
        {icon}
      </div>
    </div>
  </div>
)

const AdminPage = () => {
  const { isLoggedIn, login, logout } = useAuth()
  const [viewState, setViewState] = useState<AdminViewState>('checking')
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter>('ALL')
  const [email, setEmail] = useState(defaultCredentials.email)
  const [password, setPassword] = useState(defaultCredentials.password)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [actionModal, setActionModal] = useState<{ type: 'delete' | 'block' | null; userId: string | null }>({ type: null, userId: null })
  const [isActionProcessing, setIsActionProcessing] = useState(false)
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set())
  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'stats'>('dashboard')
  const itemsPerPage = 10

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesRole = roleFilter === 'ALL' || user.role === roleFilter
      const keyword = searchTerm.trim().toLowerCase()
      const matchesSearch =
        keyword.length === 0 ||
        user.nom.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword)

      return matchesRole && matchesSearch
    })
  }, [roleFilter, searchTerm, users])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [roleFilter, searchTerm])

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

  const selectedUser = useMemo(() => {
    if (paginatedUsers.length === 0) return null
    return paginatedUsers.find((user) => user.id === selectedUserId) || paginatedUsers[0]
  }, [paginatedUsers, selectedUserId])

  const loadDashboard = async () => {
    setIsRefreshing(true)
    setPageError(null)

    try {
      const [overviewResponse, usersResponse] = await Promise.all([
        apiService.get<AdminOverview>('/utilisateurs/admin/overview'),
        apiService.get<UserRecord[]>('/utilisateurs'),
      ])

      if (overviewResponse.error) {
        throw new Error(overviewResponse.error)
      }

      if (usersResponse.error) {
        throw new Error(usersResponse.error)
      }

      const nextUsers = usersResponse.data || []

      setOverview(overviewResponse.data || null)
      setUsers(nextUsers)
      setSelectedUserId((current) => current || nextUsers[0]?.id || null)
      setViewState('ready')
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Impossible de charger le tableau de bord admin.')
      setViewState('ready')
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    const initializeAdmin = async () => {
      const token = window.localStorage.getItem('token')
      if (!token || !isLoggedIn) {
        if (!cancelled) {
          setAdminUser(null)
          setOverview(null)
          setUsers([])
          setViewState('login')
        }
        return
      }

      setViewState('checking')
      setPageError(null)

      const profileResponse = await apiService.get<{ data?: { utilisateur?: AdminUser } }>('/auth/profile')
      if (cancelled) return

      if (profileResponse.error) {
        logout()
        setViewState('login')
        return
      }

      const utilisateur = profileResponse.data?.data?.utilisateur
      if (!utilisateur) {
        logout()
        setViewState('login')
        return
      }

      setAdminUser(utilisateur)

      if (utilisateur.role !== 'ADMIN') {
        setViewState('forbidden')
        return
      }

      await loadDashboard()
    }

    void initializeAdmin()

    return () => {
      cancelled = true
    }
  }, [isLoggedIn, logout])

  const handleAdminLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    setLoginError(null)

    try {
      const response = await apiService.post<{ data?: { utilisateur?: AdminUser; jeton?: string } }>('/auth/login', {
        email: email.trim(),
        motDePasse: password,
      })

      if (response.error) {
        setLoginError(response.error)
        return
      }

      const utilisateur = response.data?.data?.utilisateur
      const token = response.data?.data?.jeton

      if (!utilisateur || !token) {
        setLoginError('Réponse de connexion invalide.')
        return
      }

      if (utilisateur.role !== 'ADMIN') {
        setLoginError('Ce compte ne possède pas les droits administrateur.')
        return
      }

      login(token)
      setAdminUser(utilisateur)
      setViewState('checking')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogout = () => {
    logout()
    setAdminUser(null)
    setOverview(null)
    setUsers([])
    setPageError(null)
    setViewState('login')
  }

  const handleDeleteUser = async () => {
    if (!actionModal.userId) return

    setIsActionProcessing(true)
    try {
      const response = await apiService.delete(`/utilisateurs/${actionModal.userId}`)
      if (response.error) {
        throw new Error(response.error)
      }
      setUsers((prev) => prev.filter((u) => u.id !== actionModal.userId))
      setActionModal({ type: null, userId: null })
      await loadDashboard()
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Erreur lors de la suppression')
    } finally {
      setIsActionProcessing(false)
    }
  }

  const handleBlockUser = async () => {
    if (!actionModal.userId) return

    setIsActionProcessing(true)
    try {
      const isBlocked = blockedUsers.has(actionModal.userId)
      const response = await apiService.put(`/utilisateurs/${actionModal.userId}/${isBlocked ? 'unblock' : 'block'}`, {})
      if (response.error) {
        throw new Error(response.error)
      }
      
      const newBlocked = new Set(blockedUsers)
      if (isBlocked) {
        newBlocked.delete(actionModal.userId)
      } else {
        newBlocked.add(actionModal.userId)
      }
      setBlockedUsers(newBlocked)
      setActionModal({ type: null, userId: null })
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Erreur lors du blocage')
    } finally {
      setIsActionProcessing(false)
    }
  }

  if (viewState === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-lg bg-white px-8 py-10 text-center shadow-md border border-gray-200">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-[#01333D]" />
          <p className="text-lg font-semibold text-gray-800">Vérification…</p>
        </div>
      </div>
    )
  }

  if (viewState === 'forbidden') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="max-w-md rounded-lg border border-orange-200 bg-white p-8 shadow-md">
          <div className="mb-4 inline-flex rounded-lg bg-orange-100 p-3 text-orange-700">
            <FiShield className="text-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Accès refusé</h1>
          <p className="mt-3 text-gray-600">
            Le compte connecté n'a pas les droits <span className="font-semibold">ADMIN</span>.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleLogout}
              className="flex-1 rounded-lg bg-[#01333D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#024754]"
            >
              Revenir
            </button>
            <Link
              to="/home"
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Accueil
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (viewState === 'login') {
    return (
      <div className="min-h-screen bg-gray-50 px-6 py-8 flex items-center justify-center">
        <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-md">
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord Admin</h1>
          <p className="mt-2 text-sm text-gray-600">Connecte-toi avec tes identifiants administrateur.</p>

          <form onSubmit={handleAdminLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#01333D] focus:ring-2 focus:ring-[#01333D]/20"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#01333D] focus:ring-2 focus:ring-[#01333D]/20"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-[#01333D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#024754] disabled:opacity-70"
            >
              {isSubmitting ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          {loginError && (
            <p className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {loginError}
            </p>
          )}

          <div className="mt-6 rounded-lg bg-gray-50 p-4 text-xs text-gray-600">
            <p className="font-medium text-gray-700 mb-2">Compte démo:</p>
            <p>Email: <span className="font-semibold">admin@meetSync.com</span></p>
            <p>MDP: <span className="font-semibold">admin@1234</span></p>
          </div>

          <div className="mt-6 flex gap-3 text-sm">
            <Link to="/" className="font-medium text-[#01333D] hover:underline">Accueil</Link>
            <Link to="/login" className="font-medium text-gray-500 hover:text-gray-700">Connexion</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#01333D] text-white flex flex-col border-r border-white/10">
        <div className="p-6 border-b border-white/10">
          <h1 className="font-logo text-2xl tracking-wider">ADMIN</h1>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <button
            onClick={() => {
              setActiveTab('dashboard')
              setCurrentPage(1)
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition ${
              activeTab === 'dashboard' ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/10'
            }`}
          >
            <FiBarChart2 size={20} />
            <span>Tableau de bord</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('users')
              setCurrentPage(1)
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition ${
              activeTab === 'users' ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/10'
            }`}
          >
            <FiUsers size={20} />
            <span>Utilisateurs</span>
          </button>
        </nav>

        <div className="border-t border-white/10 p-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition font-medium"
          >
            <FiLogOut size={20} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-8 h-16">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Tableau de bord administrateur</h2>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/home"
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              <span>Interface utilisateur</span>
              <FiArrowRight size={18} />
            </Link>
            <button
              onClick={() => loadDashboard()}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              <FiRefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
              Actualiser
            </button>
            <div className="text-sm text-gray-600">
              {adminUser?.email}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-8 py-8">
          {pageError && (
            <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 px-5 py-4 text-sm text-amber-800">
              {pageError}
            </div>
          )}

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <>
              {/* Stats Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <StatCard
                  title="Utilisateurs"
                  value={String(overview?.users.total ?? 0)}
                  icon={<FiUsers />}
                />
                <StatCard
                  title="Réunions"
                  value={String(overview?.meetings.total ?? 0)}
                  icon={<FiActivity />}
                />
                <StatCard
                  title="Tâches"
                  value={String(overview?.tasks.total ?? 0)}
                  icon={<FiClock />}
                />
                <StatCard
                  title="Admins"
                  value={String(overview?.users.admins ?? 0)}
                  icon={<FiShield />}
                />
              </div>

              {/* Recent Activity */}
              <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 px-8 py-6">
                  <h3 className="text-lg font-semibold text-gray-900">Activité récente</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {(overview?.recentUsers || []).length > 0 ? (
                    (overview?.recentUsers || []).slice(0, 5).map((user) => (
                      <div key={user.id} className="px-8 py-4 flex items-center justify-between hover:bg-gray-50 transition">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{user.nom}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {user.role}
                          </span>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">{formatDate(user.creeA)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-8 py-8 text-center text-gray-500">
                      Aucune activité récente
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <>
              <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 px-8 py-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Gestion des utilisateurs</h3>
                    <div className="flex gap-3">
                      <label className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="search"
                          placeholder="Rechercher..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:border-[#01333D] focus:ring-2 focus:ring-[#01333D]/20"
                        />
                      </label>
                      <label className="relative">
                        <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <select
                          value={roleFilter}
                          onChange={(e) => {
                            if (isUserRoleFilter(e.target.value)) {
                              setRoleFilter(e.target.value)
                            }
                          }}
                          className="appearance-none pl-10 pr-4 py-2 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:border-[#01333D] focus:ring-2 focus:ring-[#01333D]/20"
                        >
                          <option value="ALL">Tous les rôles</option>
                          <option value="ADMIN">Admin</option>
                          <option value="HOTE">Hôte</option>
                          <option value="PARTICIPANT">Participant</option>
                        </select>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-8 py-4 text-left text-sm font-semibold text-gray-900">Utilisateur</th>
                        <th className="px-8 py-4 text-left text-sm font-semibold text-gray-900">Email</th>
                        <th className="px-8 py-4 text-left text-sm font-semibold text-gray-900">Rôle</th>
                        <th className="px-8 py-4 text-left text-sm font-semibold text-gray-900">Date</th>
                        <th className="px-8 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedUsers.map((user) => (
                        <tr
                          key={user.id}
                          onClick={() => setSelectedUserId(user.id)}
                          className={`border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition ${
                            selectedUser?.id === user.id ? 'bg-blue-50' : ''
                          }`}
                        >
                          <td className="px-8 py-4 text-sm font-medium text-gray-900">{user.nom}</td>
                          <td className="px-8 py-4 text-sm text-gray-600">{user.email}</td>
                          <td className="px-8 py-4 text-sm">
                            <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                              {user.role}
                            </span>
                          </td>
                          <td className="px-8 py-4 text-sm text-gray-500">{formatDate(user.creeA)}</td>
                          <td className="px-8 py-4 text-sm relative">
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenMenuUserId(openMenuUserId === user.id ? null : user.id)
                                }}
                                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition"
                              >
                                <FiMoreVertical size={18} />
                              </button>
                              
                              {openMenuUserId === user.id && (
                                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setActionModal({ type: 'block', userId: user.id })
                                      setOpenMenuUserId(null)
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 first:rounded-t-lg border-b border-gray-100"
                                  >
                                    {blockedUsers.has(user.id) ? (
                                      <>
                                        <FiUnlock size={16} className="text-green-600" />
                                        <span className="text-green-700">Débloquer</span>
                                      </>
                                    ) : (
                                      <>
                                        <FiLock size={16} style={{color: '#01333D'}} />
                                        <span style={{color: '#01333D'}}>Bloquer</span>
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setActionModal({ type: 'delete', userId: user.id })
                                      setOpenMenuUserId(null)
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 flex items-center gap-2 last:rounded-b-lg text-red-700"
                                  >
                                    <FiTrash2 size={16} />
                                    <span>Supprimer</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredUsers.length === 0 && (
                    <div className="px-8 py-8 text-center text-gray-500">
                      Aucun utilisateur ne correspond
                    </div>
                  )}
                  {filteredUsers.length > 0 && (
                    <div className="border-t border-gray-200 px-8 py-4 flex items-center justify-between bg-gray-50">
                      <div className="text-sm text-gray-600">
                        Affichage {startIndex + 1} à {Math.min(endIndex, filteredUsers.length)} sur {filteredUsers.length} utilisateurs
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Précédent
                        </button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                                currentPage === page
                                  ? 'bg-[#01333D] text-white'
                                  : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Suivant
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

        </main>

        {/* Confirmation Modal */}
        {actionModal.type && actionModal.userId && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-8 max-w-md shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-lg ${
                  actionModal.type === 'delete' 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-[#01333D]/10 text-[#01333D]'
                }`}>
                  {actionModal.type === 'delete' ? (
                    <FiTrash2 size={24} />
                  ) : blockedUsers.has(actionModal.userId) ? (
                    <FiUnlock size={24} />
                  ) : (
                    <FiLock size={24} />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {actionModal.type === 'delete'
                    ? 'Supprimer l\'utilisateur'
                    : blockedUsers.has(actionModal.userId)
                    ? 'Débloquer l\'utilisateur'
                    : 'Bloquer l\'utilisateur'}
                </h3>
              </div>

              <p className="text-gray-600 mb-6">
                {actionModal.type === 'delete'
                  ? 'Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.'
                  : blockedUsers.has(actionModal.userId)
                  ? 'Cet utilisateur pourra à nouveau se connecter.'
                  : 'Cet utilisateur ne pourra plus se connecter à l\'application.'}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setActionModal({ type: null, userId: null })}
                  disabled={isActionProcessing}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-70"
                >
                  Annuler
                </button>
                <button
                  onClick={actionModal.type === 'delete' ? handleDeleteUser : handleBlockUser}
                  disabled={isActionProcessing}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-white font-medium disabled:opacity-70 ${
                    actionModal.type === 'delete'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-[#01333D] hover:bg-[#024754]'
                  }`}
                >
                  {isActionProcessing ? 'Traitement...' : (
                    actionModal.type === 'delete'
                      ? 'Supprimer'
                      : blockedUsers.has(actionModal.userId)
                      ? 'Débloquer'
                      : 'Bloquer'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminPage
