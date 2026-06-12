import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { X, UserPlus, Trash2, Shield, GraduationCap, User as UserIcon } from 'lucide-react'
import api from '../../api/client'
import type { ProjectMember, User } from '../../types'
import ConfirmDialog from './ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'

interface ProjectMembersModalProps {
  projectId: string
  projectTitle: string
  onClose: () => void
}

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

const ROLE_ICONS: Record<Role, ReactElement> = {
  Participant: <UserIcon className="w-3.5 h-3.5" />,
  Organizer: <Shield className="w-3.5 h-3.5" />,
  Mentor: <GraduationCap className="w-3.5 h-3.5" />,
}

export default function ProjectMembersModal({
  projectId,
  projectTitle,
  onClose,
}: ProjectMembersModalProps) {
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [showAddForm, setShowAddForm] = useState<boolean>(false)
  const [newUserId, setNewUserId] = useState<string>('')
  const [newRole, setNewRole] = useState<Role>('Participant')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  const currentUserId = sessionStorage.getItem('userId')
  const { confirm, confirmProps } = useConfirm()

  useEffect(() => {
    loadAll()
  }, [projectId])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [membersRes, usersRes] = await Promise.all([
        api.get<ProjectMember[]>(`/projects/${projectId}/members`),
        api.get<User[]>('/users'),
      ])
      setMembers(membersRes.data)
      setAllUsers(usersRes.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити')
    } finally {
      setLoading(false)
    }
  }

  const availableUsers = allUsers.filter(
    (u) => !members.some((m) => m.userId === u.id)
  )

  const showMessage = (msg: string, isError = false) => {
    if (isError) {
      setError(msg)
      setSuccess('')
    } else {
      setSuccess(msg)
      setError('')
    }
    setTimeout(() => {
      setError('')
      setSuccess('')
    }, 3000)
  }

  const handleAddMember = async () => {
    if (!newUserId) {
      showMessage('Оберіть користувача', true)
      return
    }

    try {
      await api.post(`/projects/${projectId}/members`, {
        userId: newUserId,
        role: newRole,
      })
      setNewUserId('')
      setNewRole('Participant')
      setShowAddForm(false)
      showMessage('Учасника додано')
      loadAll()
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Не вдалося додати', true)
    }
  }

  const handleChangeRole = async (memberUserId: string, role: Role) => {
    try {
      await api.put(`/projects/${projectId}/members/${memberUserId}/role`, { role })
      showMessage('Роль змінена')
      loadAll()
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Не вдалося змінити роль', true)
    }
  }

  const handleRemoveMember = async (memberUserId: string, fullName: string) => {
    const ok = await confirm({
      title: 'Видалення учасника',
      message: `Видалити ${fullName} з проєкту?`,
      confirmText: 'Видалити',
      confirmVariant: 'danger',
    })
    if (!ok) return

    try {
      await api.delete(`/projects/${projectId}/members/${memberUserId}`)
      showMessage('Учасника видалено')
      loadAll()
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Не вдалося видалити', true)
    }
  }

  const meAsMember = members.find((m) => m.userId === currentUserId)
  const isOrganizer = meAsMember?.role === 'Organizer'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Учасники проєкту</h2>
            <p className="text-sm text-slate-500 truncate max-w-md">{projectTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
            aria-label="Закрити"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-3 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-2 mb-3 text-sm">
              {success}
            </div>
          )}

          {loading ? (
            <div className="text-center text-slate-500 py-8">Завантаження...</div>
          ) : (
            <>
              {/* Кнопка додати */}
              {isOrganizer && !showAddForm && availableUsers.length > 0 && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="mb-4 inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  <UserPlus className="w-4 h-4" />
                  Додати учасника
                </button>
              )}

              {/* Форма додавання */}
              {showAddForm && (
                <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Користувач
                    </label>
                    <select
                      value={newUserId}
                      onChange={(e) => setNewUserId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Оберіть користувача</option>
                      {availableUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName} ({u.email})
                        </option>
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
                      onClick={handleAddMember}
                      className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      Додати
                    </button>
                    <button
                      onClick={() => {
                        setShowAddForm(false)
                        setNewUserId('')
                        setNewRole('Participant')
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      Скасувати
                    </button>
                  </div>
                </div>
              )}

              {/* Список учасників */}
              {members.length === 0 ? (
                <p className="text-center text-slate-400 py-8">Учасників немає</p>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => {
                    const isMe = member.userId === currentUserId
                    const role = member.role as Role

                    return (
                      <div
                        key={member.userId}
                        className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold flex-shrink-0">
                          {member.fullName[0]?.toUpperCase() || '?'}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">
                            {member.fullName}
                            {isMe && (
                              <span className="ml-2 text-xs text-slate-400">(ви)</span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{member.email}</p>
                        </div>

                        {isOrganizer && !isMe ? (
                          <select
                            value={member.role}
                            onChange={(e) => handleChangeRole(member.userId, e.target.value as Role)}
                            className={`text-xs px-2 py-1 rounded font-medium border-0 cursor-pointer ${ROLE_COLORS[role]}`}
                          >
                            <option value="Participant">Учасник</option>
                            <option value="Mentor">Ментор</option>
                            <option value="Organizer">Організатор</option>
                          </select>
                        ) : (
                          <span
                            className={`text-xs px-2 py-1 rounded font-medium inline-flex items-center gap-1 ${ROLE_COLORS[role]}`}
                          >
                            {ROLE_ICONS[role]}
                            {ROLE_LABELS[role]}
                          </span>
                        )}

                        {isOrganizer && !isMe && (
                          <button
                            onClick={() => handleRemoveMember(member.userId, member.fullName)}
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

              {!isOrganizer && (
                <p className="text-xs text-slate-400 mt-4 text-center">
                  Тільки організатор проєкту може керувати учасниками
                </p>
              )}
            </>
          )}
        </div>

        <ConfirmDialog {...confirmProps} />
      </div>
    </div>
  )
}