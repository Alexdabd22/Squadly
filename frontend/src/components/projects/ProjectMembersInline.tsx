import { useEffect, useState } from 'react'
import { UserPlus, Trash2, Shield, GraduationCap, User as UserIcon } from 'lucide-react'
import api from '../../api/client'
import type { ProjectMember, User } from '../../types'
import ConfirmDialog from '../common/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'

type Role = 'Participant' | 'Organizer' | 'Mentor'

const ROLE_LABELS: Record<Role, string> = {
  Participant: 'Учасник',
  Organizer: 'Організатор',
  Mentor: 'Ментор',
}

const ROLE_COLORS: Record<Role, string> = {
  Participant: 'bg-slate-100 text-slate-700',
  Organizer: 'bg-amber-100 text-amber-700',
  Mentor: 'bg-purple-100 text-purple-700',
}

interface Props {
  projectId: string
  isOrganizer: boolean
  onChanged?: () => void
}

export default function ProjectMembersInline({ projectId, isOrganizer, onChanged }: Props) {
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newUserId, setNewUserId] = useState('')
  const [newRole, setNewRole] = useState<Role>('Participant')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const currentUserId = sessionStorage.getItem('userId')
  const { confirm, confirmProps } = useConfirm()

  useEffect(() => { loadAll() }, [projectId])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [m, u] = await Promise.all([
        api.get<ProjectMember[]>(`/projects/${projectId}/members`),
        api.get<User[]>('/users'),
      ])
      setMembers(m.data)
      setAllUsers(u.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити')
    } finally {
      setLoading(false)
    }
  }

  const availableUsers = allUsers.filter((u) => !members.some((m) => m.userId === u.id))

  const showMsg = (msg: string, isErr = false) => {
    if (isErr) { setError(msg); setSuccess('') } else { setSuccess(msg); setError('') }
    setTimeout(() => { setError(''); setSuccess('') }, 3000)
  }

  const handleAdd = async () => {
    if (!newUserId) { showMsg('Оберіть користувача', true); return }
    try {
      await api.post(`/projects/${projectId}/members`, { userId: newUserId, role: newRole })
      setNewUserId(''); setNewRole('Participant'); setShowAddForm(false)
      showMsg('Учасника додано')
      loadAll(); onChanged?.()
    } catch (err: any) {
      showMsg(err.response?.data?.message || 'Не вдалося додати', true)
    }
  }

  const handleChangeRole = async (uid: string, role: Role) => {
    try {
      await api.put(`/projects/${projectId}/members/${uid}/role`, { role })
      showMsg('Роль змінена')
      loadAll(); onChanged?.()
    } catch (err: any) {
      showMsg(err.response?.data?.message || 'Не вдалося змінити роль', true)
    }
  }

  const handleRemove = async (uid: string, name: string) => {
    const ok = await confirm({
      title: 'Видалення учасника',
      message: `Видалити ${name} з проєкту?`,
      confirmText: 'Видалити',
      confirmVariant: 'danger',
    })
    if (!ok) return
    try {
      await api.delete(`/projects/${projectId}/members/${uid}`)
      showMsg('Учасника видалено')
      loadAll(); onChanged?.()
    } catch (err: any) {
      showMsg(err.response?.data?.message || 'Не вдалося видалити', true)
    }
  }

  if (loading) return <div className="text-slate-500 text-sm p-4">Завантаження…</div>

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Учасники проєкту</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {isOrganizer
              ? 'Як організатор, ви можете додавати учасників і керувати їх ролями'
              : 'Лише організатор може керувати учасниками'}
          </p>
        </div>
        {isOrganizer && !showAddForm && availableUsers.length > 0 && (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
          >
            <UserPlus className="w-4 h-4" />
            Додати
          </button>
        )}
      </div>

      <div className="p-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-3 text-sm">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-2 mb-3 text-sm">{success}</div>
        )}

        {showAddForm && (
          <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Користувач</label>
              <select
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Оберіть користувача</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Роль</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as Role)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="Participant">Учасник</option>
                <option value="Mentor">Ментор</option>
                <option value="Organizer">Організатор</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Додати
              </button>
              <button
                onClick={() => { setShowAddForm(false); setNewUserId(''); setNewRole('Participant') }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium"
              >
                Скасувати
              </button>
            </div>
          </div>
        )}

        {members.length === 0 ? (
          <p className="text-center text-slate-400 py-8">Учасників немає</p>
        ) : (
          <div className="space-y-2">
            {members.map((m) => {
              const isMe = m.userId === currentUserId
              const role = m.role as Role
              return (
                <div key={m.userId} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold flex-shrink-0">
                    {m.fullName[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {m.fullName}
                      {isMe && <span className="ml-2 text-xs text-slate-400">(ви)</span>}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{m.email}</p>
                  </div>

                  {isOrganizer && !isMe ? (
                    <select
                      value={m.role}
                      onChange={(e) => handleChangeRole(m.userId, e.target.value as Role)}
                      className={`text-xs px-2 py-1 rounded font-medium border-0 cursor-pointer ${ROLE_COLORS[role]}`}
                    >
                      <option value="Participant">Учасник</option>
                      <option value="Mentor">Ментор</option>
                      <option value="Organizer">Організатор</option>
                    </select>
                  ) : (
                    <span className={`text-xs px-2 py-1 rounded font-medium inline-flex items-center gap-1 ${ROLE_COLORS[role]}`}>
                      {role === 'Organizer' && <Shield className="w-3.5 h-3.5" />}
                      {role === 'Mentor' && <GraduationCap className="w-3.5 h-3.5" />}
                      {role === 'Participant' && <UserIcon className="w-3.5 h-3.5" />}
                      {ROLE_LABELS[role]}
                    </span>
                  )}

                  {isOrganizer && !isMe && (
                    <button
                      onClick={() => handleRemove(m.userId, m.fullName)}
                      className="text-red-600 hover:text-red-700 p-1"
                      title="Видалити з проєкту"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ConfirmDialog {...confirmProps} />
    </div>
  )
}
