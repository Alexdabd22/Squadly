import { useEffect, useState } from 'react'
import api from '../../api/client'
import type { TaskItem, TaskStatus, TaskPriority } from '../../types'
import {
  TASK_STATUS_LABEL,
  TASK_STATUS_BADGE,
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_BADGE,
} from '../../constants/task'
import { formatRelativeTime } from '../../utils/date'
import TaskDetailsModal from '../../components/tasks/TaskDetailsModal'
import SubmitTaskModal from '../../components/tasks/SubmitTaskModal'

type Filter = 'all' | TaskStatus

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const [detailTask, setDetailTask] = useState<TaskItem | null>(null)
  const [submitModal, setSubmitModal] = useState<{ taskId: string; taskTitle: string } | null>(null)

  const currentUserId = sessionStorage.getItem('userId')

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    setLoading(true)
    try {
      const res = await api.get<TaskItem[]>('/tasks')
      // Тільки мої задачі
      const myTasks = res.data.filter((t) => t.assignee?.id === currentUserId)
      setTasks(myTasks)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити задачі')
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter)

  // Групуємо за проєктом
  const grouped = filtered.reduce<Record<string, { projectTitle: string; tasks: TaskItem[] }>>((acc, task) => {
    const key = task.project?.id || 'no-project'
    if (!acc[key]) {
      acc[key] = { projectTitle: task.project?.title || 'Без проєкту', tasks: [] }
    }
    acc[key].tasks.push(task)
    return acc
  }, {})

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'Усі', count: tasks.length },
    { key: 'ToDo', label: 'До виконання', count: tasks.filter((t) => t.status === 'ToDo').length },
    { key: 'InProgress', label: 'В роботі', count: tasks.filter((t) => t.status === 'InProgress').length },
    { key: 'NeedsRevision', label: 'Доопрацювання', count: tasks.filter((t) => t.status === 'NeedsRevision').length },
    { key: 'InReview', label: 'На перевірці', count: tasks.filter((t) => t.status === 'InReview').length },
    { key: 'Done', label: 'Виконано', count: tasks.filter((t) => t.status === 'Done').length },
  ]

  if (loading) return <div className="max-w-5xl mx-auto p-6 text-slate-500">Завантаження…</div>

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Мої задачі</h1>
        <p className="text-sm text-slate-500 mt-1">Задачі, призначені вам з усіх проєктів</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-sm">{error}</div>
      )}

      {/* Фільтри */}
      <div className="flex gap-2 flex-wrap mb-6">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            {f.label}
            {f.count > 0 && (
              <span className={`ml-1.5 ${filter === f.key ? 'text-primary-200' : 'text-slate-400'}`}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Список */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
          {tasks.length === 0
            ? 'У вас поки немає призначених задач.'
            : 'Немає задач з таким статусом.'}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([projectId, group]) => (
            <div key={projectId}>
              <h2 className="text-sm font-semibold text-slate-500 uppercase mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-400" />
                {group.projectTitle}
              </h2>

              <div className="space-y-2">
                {group.tasks.map((task) => {
                  const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Done'
                  const isNeedsRevision = task.status === 'NeedsRevision'
                  const canSubmit = task.status === 'InProgress' || isNeedsRevision

                  return (
                    <div
                      key={task.id}
                      onClick={() => setDetailTask(task)}
                      className={`bg-white rounded-xl border p-4 hover:shadow-md transition cursor-pointer ${
                        isNeedsRevision ? 'border-amber-300' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${TASK_STATUS_BADGE[task.status]}`}>
                              {TASK_STATUS_LABEL[task.status]}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${TASK_PRIORITY_BADGE[task.priority]}`}>
                              {TASK_PRIORITY_LABEL[task.priority]}
                            </span>
                            {task.pointsAwarded && (
                              <span className="text-xs px-2 py-0.5 rounded font-medium bg-green-100 text-green-700">✓ Бали</span>
                            )}
                          </div>
                          <h3 className="font-medium text-slate-900 truncate">{task.title}</h3>
                          {task.description && (
                            <p className="text-xs text-slate-500 truncate mt-0.5">{task.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {task.dueDate && (
                            <span className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                              {new Date(task.dueDate).toLocaleDateString('uk-UA')}
                            </span>
                          )}
                          {canSubmit && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSubmitModal({ taskId: task.id, taskTitle: task.title })
                              }}
                              className="text-xs bg-primary-600 hover:bg-primary-700 text-white px-2.5 py-1 rounded-lg font-medium"
                            >
                              Здати
                            </button>
                          )}
                        </div>
                      </div>

                      {isNeedsRevision && task.reviewComment && (
                        <div className="mt-2 bg-amber-50 rounded-lg px-3 py-2 text-xs text-amber-700">
                          Причина: {task.reviewComment}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskDetailsModal
        open={detailTask !== null}
        task={detailTask}
        onClose={() => setDetailTask(null)}
        onChanged={loadTasks}
      />

      {submitModal && (
        <SubmitTaskModal
          open={true}
          taskId={submitModal.taskId}
          taskTitle={submitModal.taskTitle}
          onClose={() => setSubmitModal(null)}
          onSubmitted={loadTasks}
        />
      )}
    </div>
  )
}