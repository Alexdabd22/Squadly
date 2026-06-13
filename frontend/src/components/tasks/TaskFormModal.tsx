import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import api from '../../api/client'
import type {
  TaskItem,
  TaskStatus,
  TaskPriority,
  ProjectMember,
} from '../../types'

interface Props {
  open: boolean
  mode: 'create' | 'edit'
  projectId: string
  initial?: TaskItem | null
  defaultStatus?: TaskStatus
  onClose: () => void
  onSaved: () => void
}

interface FormState {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assigneeUserId: string
  dueDate: string
}

const EMPTY: FormState = {
  title: '',
  description: '',
  status: 'ToDo',
  priority: 'Medium',
  assigneeUserId: '',
  dueDate: '',
}

const toDateInput = (iso?: string | null) => (iso ? iso.substring(0, 10) : '')

export default function TaskFormModal({
  open,
  mode,
  projectId,
  initial,
  defaultStatus,
  onClose,
  onSaved,
}: Props) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')

    if (mode === 'edit' && initial) {
      setForm({
        title: initial.title,
        description: initial.description ?? '',
        status: initial.status,
        priority: initial.priority,
        assigneeUserId: initial.assignee?.id ?? '',
        dueDate: toDateInput(initial.dueDate),
      })
    } else {
      setForm({ ...EMPTY, status: defaultStatus ?? 'ToDo' })
    }

    // Завантаження учасників проєкту, щоб у виконавці пропонувати лише їх
    api
      .get<ProjectMember[]>(`/projects/${projectId}/members`)
      .then((res) => setMembers(res.data))
      .catch(() => setMembers([]))
  }, [open, mode, initial, defaultStatus, projectId])

  if (!open) return null

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setError('Назва обов\'язкова')
      return
    }
    setLoading(true)
    setError('')

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      priority: form.priority,
      assigneeUserId: form.assigneeUserId || null,
      dueDate: form.dueDate || null,
    }

    try {
      if (mode === 'create') {
        await api.post('/tasks', { ...payload, projectId })
      } else if (initial) {
        await api.put(`/tasks/${initial.id}`, payload)
      }
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося зберегти')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            {mode === 'create' ? 'Нова задача' : 'Редагування задачі'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Назва *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              autoFocus
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Опис</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Статус</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="ToDo">До виконання</option>
                <option value="InProgress">В роботі</option>
                <option value="Done">Виконано</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Пріоритет</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="Low">Низький</option>
                <option value="Medium">Середній</option>
                <option value="High">Високий</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Виконавець</label>
            <select
              value={form.assigneeUserId}
              onChange={(e) => setForm({ ...form, assigneeUserId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Без виконавця</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.fullName} ({m.email})
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">Лише учасники цього проєкту</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Дедлайн</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700"
          >
            Скасувати
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50"
          >
            {loading ? 'Збереження…' : mode === 'create' ? 'Створити' : 'Зберегти'}
          </button>
        </div>
      </div>
    </div>
  )
}