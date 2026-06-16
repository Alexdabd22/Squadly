import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Trash2, Save, X } from 'lucide-react'
import api from '../../api/client'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'
import type { GlobalRole } from '../../types'
import AdminChatPage from './AdminChatPage'

interface AdminUser {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  globalRole: GlobalRole
  createdAt: string
  lastLoginAt?: string
  projectsCreated: number
}

interface AdminProject {
  id: string
  title: string
  description?: string
  createdAt: string
  owner?: { id: string; email: string; fullName: string }
  membersCount: number
  tasksCount: number
  tasksDone: number
}

interface AdminStats {
  totalUsers: number
  totalAdmins: number
  totalOrganizers: number
  totalProjects: number
  totalTasks: number
}

type Tab = 'users' | 'projects' | 'chat' | 'stats'

const ROLE_LABEL: Record<GlobalRole, string> = {
  Admin: 'Адміністратор',
  Organizer: 'Організатор',
  User: 'Користувач',
}

const ROLE_BADGE: Record<GlobalRole, string> = {
  Admin: 'bg-red-100 text-red-700',
  Organizer: 'bg-primary-100 text-primary-700',
  User: 'bg-slate-100 text-slate-700',
}

export default function AdminPage() {
  const navigate = useNavigate()
  const myRole = sessionStorage.getItem('globalRole')
  const myId = sessionStorage.getItem('userId')

  const [tab, setTab] = useState<Tab>('users')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [projects, setProjects] = useState<AdminProject[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Редагування користувача
  const [editUserId, setEditUserId] = useState<string | null>(null)
  const [editUserForm, setEditUserForm] = useState({ firstName: '', lastName: '', email: '' })

  // Редагування проєкту
  const [editProjectId, setEditProjectId] = useState<string | null>(null)
  const [editProjectForm, setEditProjectForm] = useState({ title: '', description: '' })

  const { confirm, confirmProps } = useConfirm()

  useEffect(() => {
    if (myRole !== 'Admin') navigate('/dashboard')
  }, [myRole, navigate])

  useEffect(() => {
    if (myRole !== 'Admin') return
    if (tab === 'users') loadUsers()
    else if (tab === 'projects') loadProjects()
    else if (tab === 'stats') loadStats()
  }, [tab, myRole])

  const loadUsers = async () => {
    setLoading(true); setError('')
    try {
      const res = await api.get<AdminUser[]>('/admin/users')
      setUsers(res.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити користувачів')
    } finally { setLoading(false) }
  }

  const loadProjects = async () => {
    setLoading(true); setError('')
    try {
      const res = await api.get<AdminProject[]>('/admin/projects')
      setProjects(res.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити проєкти')
    } finally { setLoading(false) }
  }

  const loadStats = async () => {
    setLoading(true); setError('')
    try {
      const res = await api.get<AdminStats>('/admin/stats')
      setStats(res.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити статистику')
    } finally { setLoading(false) }
  }

  const handleRoleChange = async (user: AdminUser, newRole: GlobalRole) => {
    if (user.globalRole === newRole) return

    const isDowngrade = user.globalRole === 'Organizer' && newRole === 'User'
    const hasProjects = user.projectsCreated > 0

    let message = `Змінити роль «${user.fullName}» на «${ROLE_LABEL[newRole]}»?`
    if (isDowngrade && hasProjects) {
      message = `Змінити роль «${user.fullName}» на «${ROLE_LABEL[newRole]}»?\n\nКористувач є організатором ${user.projectsCreated} проєкт${user.projectsCreated === 1 ? 'у' : 'ів'}. Після зниження ролі він не зможе створювати нові проєкти, але збереже доступ до вже існуючих як організатор проєкту.`
    }

    const ok = await confirm({
      title: 'Зміна ролі',
      message,
      confirmText: 'Змінити',
      confirmVariant: 'danger',
    })
    if (!ok) return
    try {
      await api.put(`/admin/users/${user.id}/global-role`, { globalRole: newRole })
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, globalRole: newRole } : u)))
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося змінити роль')
    }
  }

  const startEditUser = (u: AdminUser) => {
    setEditUserId(u.id)
    setEditUserForm({ firstName: u.firstName, lastName: u.lastName, email: u.email })
  }

  const saveEditUser = async (id: string) => {
    try {
      const res = await api.put(`/admin/users/${id}`, editUserForm)
      setUsers((prev) => prev.map((u) => (u.id === id
        ? { ...u, firstName: res.data.firstName, lastName: res.data.lastName, email: res.data.email, fullName: res.data.fullName }
        : u)))
      setEditUserId(null)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося зберегти')
    }
  }

  const handleDeleteUser = async (u: AdminUser) => {
    const ok = await confirm({
      title: 'Видалення користувача',
      message: `Видалити «${u.fullName}»? Його проєкти буде архівовано. Дію не можна скасувати.`,
      confirmText: 'Видалити',
      confirmVariant: 'danger',
    })
    if (!ok) return
    try {
      await api.delete(`/admin/users/${u.id}`)
      setUsers((prev) => prev.filter((x) => x.id !== u.id))
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося видалити')
    }
  }

  const startEditProject = (p: AdminProject) => {
    setEditProjectId(p.id)
    setEditProjectForm({ title: p.title, description: p.description ?? '' })
  }

  const saveEditProject = async (id: string) => {
    try {
      const res = await api.put(`/admin/projects/${id}`, editProjectForm)
      setProjects((prev) => prev.map((p) => (p.id === id
        ? { ...p, title: res.data.title, description: res.data.description }
        : p)))
      setEditProjectId(null)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося зберегти')
    }
  }

  const handleDeleteProject = async (p: AdminProject) => {
    const ok = await confirm({
      title: 'Видалення проєкту',
      message: `Видалити проєкт «${p.title}»? Дію не можна скасувати.`,
      confirmText: 'Видалити',
      confirmVariant: 'danger',
    })
    if (!ok) return
    try {
      await api.delete(`/admin/projects/${p.id}`)
      setProjects((prev) => prev.filter((x) => x.id !== p.id))
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося видалити')
    }
  }

  if (myRole !== 'Admin') {
    return <div className="p-6 text-slate-500">Перенаправлення...</div>
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Адмін-панель</h1>
        <p className="text-sm text-slate-500 mt-1">Керування користувачами, проєктами та системою</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      <div className="flex gap-2 border-b border-slate-200 mb-6">
        {([
          ['users', 'Користувачі'],
          ['projects', 'Усі проєкти'],
          ['chat', 'Звернення'],
          ['stats', 'Статистика'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <div className="text-slate-500 text-sm">Завантаження...</div>}

      {/* ───── КОРИСТУВАЧІ ───── */}
      {tab === 'users' && !loading && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-slate-600">
                <th className="px-4 py-3 font-medium">Користувач</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Роль</th>
                <th className="px-4 py-3 font-medium">Проєктів</th>
                <th className="px-4 py-3 font-medium">Дії</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isMe = u.id === myId
                const editing = editUserId === u.id
                return (
                  <tr key={u.id} className="hover:bg-slate-50">
                    {editing ? (
                      <>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <input
                              value={editUserForm.firstName}
                              onChange={(e) => setEditUserForm({ ...editUserForm, firstName: e.target.value })}
                              placeholder="Ім'я"
                              className="w-24 px-2 py-1 border border-slate-300 rounded text-sm"
                            />
                            <input
                              value={editUserForm.lastName}
                              onChange={(e) => setEditUserForm({ ...editUserForm, lastName: e.target.value })}
                              placeholder="Прізвище"
                              className="w-24 px-2 py-1 border border-slate-300 rounded text-sm"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            value={editUserForm.email}
                            onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${ROLE_BADGE[u.globalRole]}`}>
                            {ROLE_LABEL[u.globalRole]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{u.projectsCreated}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => saveEditUser(u.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Зберегти">
                              <Save className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditUserId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded" title="Скасувати">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold">
                              {u.firstName[0]?.toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-900">
                              {u.fullName}
                              {isMe && <span className="text-xs text-slate-400 ml-1">(ви)</span>}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{u.email}</td>
                        <td className="px-4 py-3">
                          {isMe ? (
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${ROLE_BADGE[u.globalRole]}`}>
                              {ROLE_LABEL[u.globalRole]}
                            </span>
                          ) : (
                            <select
                              value={u.globalRole}
                              onChange={(e) => handleRoleChange(u, e.target.value as GlobalRole)}
                              className="text-sm border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                              <option value="User">Користувач</option>
                              <option value="Organizer">Організатор</option>
                              <option value="Admin">Адміністратор</option>
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{u.projectsCreated}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => startEditUser(u)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded" title="Редагувати">
                              <Pencil className="w-4 h-4" />
                            </button>
                            {!isMe && (
                              <button onClick={() => handleDeleteUser(u)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Видалити">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
              {users.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Користувачів немає</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ───── ПРОЄКТИ ───── */}
      {tab === 'projects' && !loading && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-slate-600">
                <th className="px-4 py-3 font-medium">Назва</th>
                <th className="px-4 py-3 font-medium">Власник</th>
                <th className="px-4 py-3 font-medium">Учасників</th>
                <th className="px-4 py-3 font-medium">Задачі</th>
                <th className="px-4 py-3 font-medium">Дії</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((p) => {
                const editing = editProjectId === p.id
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    {editing ? (
                      <>
                        <td className="px-4 py-3" colSpan={1}>
                          <input
                            value={editProjectForm.title}
                            onChange={(e) => setEditProjectForm({ ...editProjectForm, title: e.target.value })}
                            placeholder="Назва"
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm mb-1"
                          />
                          <input
                            value={editProjectForm.description}
                            onChange={(e) => setEditProjectForm({ ...editProjectForm, description: e.target.value })}
                            placeholder="Опис"
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-4 py-3 text-slate-700">{p.owner?.fullName ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-700">{p.membersCount}</td>
                        <td className="px-4 py-3 text-slate-700">{p.tasksDone}/{p.tasksCount}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => saveEditProject(p.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Зберегти">
                              <Save className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditProjectId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded" title="Скасувати">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{p.title}</div>
                          {p.description && (
                            <div className="text-xs text-slate-500 truncate max-w-md">{p.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{p.owner?.fullName ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-700">{p.membersCount}</td>
                        <td className="px-4 py-3 text-slate-700">{p.tasksDone}/{p.tasksCount}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => startEditProject(p)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded" title="Редагувати">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteProject(p)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Видалити">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
              {projects.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Проєктів немає</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ───── ЧАТ ───── */}
      {tab === 'chat' && (
        <AdminChatPage />
      )}

      {/* ───── СТАТИСТИКА ───── */}
      {tab === 'stats' && !loading && stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs text-slate-500 uppercase mb-1">Усього користувачів</p>
            <p className="text-3xl font-bold text-primary-600">{stats.totalUsers}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs text-slate-500 uppercase mb-1">Адміністраторів</p>
            <p className="text-3xl font-bold text-red-600">{stats.totalAdmins}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs text-slate-500 uppercase mb-1">Організаторів</p>
            <p className="text-3xl font-bold text-amber-600">{stats.totalOrganizers}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs text-slate-500 uppercase mb-1">Проєктів</p>
            <p className="text-3xl font-bold text-blue-600">{stats.totalProjects}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs text-slate-500 uppercase mb-1">Задач</p>
            <p className="text-3xl font-bold text-green-600">{stats.totalTasks}</p>
          </div>
        </div>
      )}

      <ConfirmDialog {...confirmProps} />
    </div>
  )
}