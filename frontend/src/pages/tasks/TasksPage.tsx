import { useEffect, useState, ChangeEvent, FormEvent } from 'react'
import api from '../../api/client'
import type { TaskItem, TaskStatus, TaskPriority, Project, Team, User } from '../../types'

interface TaskForm {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  projectId: string
  teamId: string
  assigneeUserId: string
}

interface EditForm {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  teamId: string
  assigneeUserId: string
}

const emptyCreateForm: TaskForm = {
  title: '',
  description: '',
  status: 'ToDo',
  priority: 'Medium',
  projectId: '',
  teamId: '',
  assigneeUserId: '',
}

const emptyEditForm: EditForm = {
  title: '',
  description: '',
  status: 'ToDo',
  priority: 'Medium',
  teamId: '',
  assigneeUserId: '',
}

// Переклади статусів
const statusLabels: Record<TaskStatus, string> = {
  ToDo: 'До виконання',
  InProgress: 'В роботі',
  Done: 'Виконано',
}

// Переклади пріоритетів
const priorityLabels: Record<TaskPriority, string> = {
  Low: 'Низький',
  Medium: 'Середній',
  High: 'Високий',
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [message, setMessage] = useState<string>('')
  const [isError, setIsError] = useState<boolean>(false)
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({})
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [form, setForm] = useState<TaskForm>(emptyCreateForm)
  const [editForm, setEditForm] = useState<EditForm>(emptyEditForm)

  useEffect(() => {
    loadProjects()
    loadTeams()
    loadTasks()
    loadUsers()
  }, [])

  const showMessage = (text: string, error = false) => {
    setMessage(text)
    setIsError(error)
  }

  const loadProjects = async () => {
    try {
      const response = await api.get<Project[]>('/projects')
      setProjects(response.data)
    } catch (error: any) {
      showMessage(error.response?.data?.message || 'Не вдалося завантажити проєкти', true)
    }
  }

  const loadTeams = async () => {
    try {
      const response = await api.get<Team[]>('/teams')
      setTeams(response.data)
    } catch (error: any) {
      showMessage(error.response?.data?.message || 'Не вдалося завантажити команди', true)
    }
  }

  const loadUsers = async () => {
    try {
      const response = await api.get<User[]>('/users')
      setUsers(response.data)
    } catch (error: any) {
      showMessage(error.response?.data?.message || 'Не вдалося завантажити користувачів', true)
    }
  }

  const loadTasks = async () => {
    try {
      const response = await api.get<TaskItem[]>('/tasks')
      setTasks(response.data)
    } catch (error: any) {
      showMessage(error.response?.data?.message || 'Не вдалося завантажити задачі', true)
    }
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleEditChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setMessage('')

    if (!form.projectId) {
      showMessage('Оберіть проєкт', true)
      return
    }

    try {
      await api.post('/tasks', {
        title: form.title,
        description: form.description,
        status: form.status,
        priority: form.priority,
        projectId: form.projectId,
        teamId: form.teamId || null,
        assigneeUserId: form.assigneeUserId || null,
      })

      showMessage('Задачу створено')
      setForm(emptyCreateForm)
      loadTasks()
    } catch (error: any) {
      showMessage(error.response?.data?.message || 'Не вдалося створити задачу', true)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Видалити цю задачу?')) return
    setMessage('')
    try {
      await api.delete(`/tasks/${id}`)
      showMessage('Задачу видалено')
      loadTasks()
    } catch (error: any) {
      showMessage(error.response?.data?.message || 'Не вдалося видалити задачу', true)
    }
  }

  const getNextStatus = (status: TaskStatus): TaskStatus => {
    if (status === 'ToDo') return 'InProgress'
    if (status === 'InProgress') return 'Done'
    return 'ToDo'
  }

  const handleChangeStatus = async (task: TaskItem) => {
    setMessage('')
    try {
      await api.put(`/tasks/${task.id}`, {
        title: task.title,
        description: task.description,
        status: getNextStatus(task.status),
        priority: task.priority,
        teamId: task.team?.id || null,
        assigneeUserId: task.assignee?.id || null,
        dueDate: task.dueDate || null,
      })

      showMessage('Статус задачі оновлено')
      loadTasks()
    } catch (error: any) {
      showMessage(error.response?.data?.message || 'Не вдалося оновити статус', true)
    }
  }

  const startEditTask = (task: TaskItem) => {
    setEditingTaskId(task.id)
    setEditForm({
      title: task.title || '',
      description: task.description || '',
      status: task.status || 'ToDo',
      priority: task.priority || 'Medium',
      teamId: task.team?.id || '',
      assigneeUserId: task.assignee?.id || '',
    })
  }

  const cancelEditTask = () => {
    setEditingTaskId(null)
    setEditForm(emptyEditForm)
  }

  const handleUpdateTask = async (taskId: string) => {
    setMessage('')
    try {
      await api.put(`/tasks/${taskId}`, {
        title: editForm.title,
        description: editForm.description,
        status: editForm.status,
        priority: editForm.priority,
        teamId: editForm.teamId || null,
        assigneeUserId: editForm.assigneeUserId || null,
        dueDate: null,
      })

      showMessage('Задачу оновлено')
      setEditingTaskId(null)
      loadTasks()
    } catch (error: any) {
      showMessage(error.response?.data?.message || 'Не вдалося оновити задачу', true)
    }
  }

  const handleCommentChange = (taskId: string, value: string) => {
    setCommentTexts((prev) => ({ ...prev, [taskId]: value }))
  }

  const handleAddComment = async (taskId: string) => {
    setMessage('')

    const text = commentTexts[taskId]
    const userId = localStorage.getItem('userId')

    if (!text || !text.trim()) {
      showMessage('Введіть текст коментаря', true)
      return
    }

    if (!userId) {
      showMessage('Немає userId у localStorage', true)
      return
    }

    try {
      await api.post(`/tasks/${taskId}/comments`, {
        authorUserId: userId,
        content: text,
      })

      setCommentTexts((prev) => ({ ...prev, [taskId]: '' }))
      showMessage('Коментар додано')
      loadTasks()
    } catch (error: any) {
      showMessage(error.response?.data?.message || 'Не вдалося додати коментар', true)
    }
  }

  const statusBadge = (status: TaskStatus) => {
    const colors: Record<TaskStatus, string> = {
      ToDo: 'bg-slate-100 text-slate-700',
      InProgress: 'bg-blue-100 text-blue-700',
      Done: 'bg-green-100 text-green-700',
    }
    return `inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[status]}`
  }

  const priorityBadge = (priority: TaskPriority) => {
    const colors: Record<TaskPriority, string> = {
      Low: 'bg-slate-100 text-slate-700',
      Medium: 'bg-amber-100 text-amber-700',
      High: 'bg-red-100 text-red-700',
    }
    return `inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[priority]}`
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Задачі</h1>

      {/* Create form */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
        <h2 className="font-semibold text-slate-900 mb-3">Створити задачу</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Назва</label>
            <input
              type="text"
              name="title"
              placeholder="Назва задачі"
              value={form.title}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Опис</label>
            <input
              type="text"
              name="description"
              placeholder="Опис задачі"
              value={form.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Статус</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
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
              name="priority"
              value={form.priority}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="Low">Низький</option>
              <option value="Medium">Середній</option>
              <option value="High">Високий</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Проєкт</label>
            <select
              name="projectId"
              value={form.projectId}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">Оберіть проєкт</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Команда (необов'язково)</label>
            <select
              name="teamId"
              value={form.teamId}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Оберіть команду</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Виконавець (необов'язково)</label>
            <select
              name="assigneeUserId"
              value={form.assigneeUserId}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Оберіть користувача</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700"
            >
              Створити задачу
            </button>
          </div>
        </form>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`rounded-lg px-3 py-2 mb-4 text-sm ${
            isError
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-green-50 border border-green-200 text-green-700'
          }`}
        >
          {message}
        </div>
      )}

      <h2 className="text-lg font-semibold text-slate-900 mb-4">Всі задачі</h2>

      {tasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
          Задач поки немає.
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              {editingTaskId === task.id ? (
                /* Edit mode */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Назва</label>
                    <input
                      type="text"
                      name="title"
                      value={editForm.title}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Опис</label>
                    <input
                      type="text"
                      name="description"
                      value={editForm.description}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Статус</label>
                    <select
                      name="status"
                      value={editForm.status}
                      onChange={handleEditChange}
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
                      name="priority"
                      value={editForm.priority}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="Low">Низький</option>
                      <option value="Medium">Середній</option>
                      <option value="High">Високий</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Команда</label>
                    <select
                      name="teamId"
                      value={editForm.teamId}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Оберіть команду</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Виконавець</label>
                    <select
                      name="assigneeUserId"
                      value={editForm.assigneeUserId}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Оберіть користувача</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.fullName} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2 flex gap-2">
                    <button
                      onClick={() => handleUpdateTask(task.id)}
                      className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700"
                    >
                      Зберегти
                    </button>
                    <button
                      onClick={cancelEditTask}
                      className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-200"
                    >
                      Скасувати
                    </button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-slate-900">{task.title}</h3>
                    <div className="flex gap-2">
                      <span className={statusBadge(task.status)}>{statusLabels[task.status]}</span>
                      <span className={priorityBadge(task.priority)}>{priorityLabels[task.priority]}</span>
                    </div>
                  </div>

                  {task.description && (
                    <p className="text-sm text-slate-600 mb-3">{task.description}</p>
                  )}

                  <div className="text-sm text-slate-500 space-y-1 mb-3">
                    <div>
                      <span className="font-medium">Проєкт:</span> {task.project?.title || '—'}
                    </div>
                    <div>
                      <span className="font-medium">Команда:</span> {task.team?.name || '—'}
                    </div>
                    <div>
                      <span className="font-medium">Виконавець:</span>{' '}
                      {task.assignee?.fullName || task.assignee?.email || '—'}
                    </div>
                  </div>

                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => handleChangeStatus(task)}
                      className="text-sm bg-primary-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-primary-700"
                    >
                      Змінити статус
                    </button>
                    <button
                      onClick={() => startEditTask(task)}
                      className="text-sm bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-medium hover:bg-slate-200"
                    >
                      Редагувати
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-red-700"
                    >
                      Видалити
                    </button>
                  </div>

                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="Новий коментар"
                      value={commentTexts[task.id] || ''}
                      onChange={(e) => handleCommentChange(task.id, e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      onClick={() => handleAddComment(task.id)}
                      className="text-sm bg-primary-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-primary-700"
                    >
                      Додати коментар
                    </button>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-sm font-semibold text-slate-700 mb-2">Коментарі:</p>
                    {task.comments && task.comments.length > 0 ? (
                      <ul className="space-y-1">
                        {task.comments.map((comment) => (
                          <li key={comment.id} className="text-sm text-slate-600 bg-slate-50 rounded px-2 py-1">
                            {comment.content}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-400">Коментарів поки немає.</p>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}