import { useEffect, useState, DragEvent } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import api from '../../api/client'
import type { TaskItem, TaskStatus } from '../../types'
import {
  TASK_STATUSES,
  TASK_STATUS_LABEL,
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_BADGE,
} from '../../constants/task'
import TaskFormModal from '../tasks/TaskFormModal'
import ConfirmDialog from '../common/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'

interface Props {
  projectId: string
  canManage: boolean
}

const COLUMN_BG: Record<TaskStatus, string> = {
  ToDo: 'bg-slate-50',
  InProgress: 'bg-blue-50',
  Done: 'bg-green-50',
}

const COLUMN_HEADER: Record<TaskStatus, string> = {
  ToDo: 'text-slate-700',
  InProgress: 'text-blue-700',
  Done: 'text-green-700',
}

export default function ProjectKanbanTab({ projectId, canManage }: Props) {
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [modalInitial, setModalInitial] = useState<TaskItem | null>(null)
  const [modalDefaultStatus, setModalDefaultStatus] = useState<TaskStatus>('ToDo')

  const { confirm, confirmProps } = useConfirm()

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get<TaskItem[]>(`/tasks?projectId=${projectId}`)
      setTasks(res.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити задачі')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [projectId])

  const openCreate = (status: TaskStatus) => {
    setModalMode('create')
    setModalInitial(null)
    setModalDefaultStatus(status)
    setModalOpen(true)
  }

  const openEdit = (task: TaskItem) => {
    setModalMode('edit')
    setModalInitial(task)
    setModalOpen(true)
  }

  const handleDelete = async (task: TaskItem) => {
    const ok = await confirm({
      title: 'Видалення задачі',
      message: `Видалити «${task.title}»?`,
      confirmText: 'Видалити',
      confirmVariant: 'danger',
    })
    if (!ok) return
    try {
      await api.delete(`/tasks/${task.id}`)
      load()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося видалити')
    }
  }

  const handleDragStart = (e: DragEvent<HTMLDivElement>, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>, status: TaskStatus) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverStatus !== status) setDragOverStatus(status)
  }

  const handleDrop = async (e: DragEvent<HTMLDivElement>, newStatus: TaskStatus) => {
    e.preventDefault()
    setDragOverStatus(null)
    const taskId = e.dataTransfer.getData('text/plain')
    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.status === newStatus) return

    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)))

    try {
      await api.put(`/tasks/${task.id}`, {
        title: task.title,
        description: task.description ?? '',
        status: newStatus,
        priority: task.priority,
        assigneeUserId: task.assignee?.id ?? null,
        dueDate: task.dueDate ?? null,
      })
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося оновити статус')
      load()
    }
  }

  if (loading) return <div className="text-slate-500 text-sm p-4">Завантаження задач…</div>

  return (
    <div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TASK_STATUSES.map((status) => {
          const columnTasks = tasks.filter((t) => t.status === status)
          const dragOver = dragOverStatus === status
          return (
            <div
              key={status}
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={() => setDragOverStatus(null)}
              onDrop={(e) => handleDrop(e, status)}
              className={`rounded-2xl border-2 transition-colors p-3 min-h-[300px] ${COLUMN_BG[status]} ${
                dragOver ? 'border-primary-400' : 'border-transparent'
              }`}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className={`font-semibold text-sm ${COLUMN_HEADER[status]}`}>
                  {TASK_STATUS_LABEL[status]}{' '}
                  <span className="text-slate-400 font-normal">({columnTasks.length})</span>
                </h3>
                <button
                  onClick={() => openCreate(status)}
                  className="text-slate-400 hover:text-primary-600"
                  title="Додати задачу"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {columnTasks.map((task) => {
                  const overdue =
                    task.dueDate &&
                    new Date(task.dueDate) < new Date() &&
                    task.status !== 'Done'
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm hover:shadow-md transition cursor-grab active:cursor-grabbing"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-medium text-sm text-slate-900 break-words">
                          {task.title}
                        </h4>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${TASK_PRIORITY_BADGE[task.priority]}`}
                        >
                          {TASK_PRIORITY_LABEL[task.priority]}
                        </span>
                      </div>

                      {task.description && (
                        <p className="text-xs text-slate-500 mb-2 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="truncate">
                          {task.assignee?.fullName || 'Без виконавця'}
                        </span>
                        {task.dueDate && (
                          <span className={overdue ? 'text-red-600 font-medium' : ''}>
                            {new Date(task.dueDate).toLocaleDateString('uk-UA')}
                          </span>
                        )}
                      </div>

                      <div className="flex gap-1 mt-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => openEdit(task)}
                          className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3" />
                          Редагувати
                        </button>
                        {canManage && (
                          <button
                            onClick={() => handleDelete(task)}
                            className="text-xs text-red-600 hover:text-red-700 inline-flex items-center gap-1 ml-auto"
                          >
                            <Trash2 className="w-3 h-3" />
                            Видалити
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
                {columnTasks.length === 0 && (
                  <p className="text-center text-xs text-slate-400 py-6">Перетягни сюди</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <TaskFormModal
        open={modalOpen}
        mode={modalMode}
        projectId={projectId}
        initial={modalInitial}
        defaultStatus={modalDefaultStatus}
        onClose={() => setModalOpen(false)}
        onSaved={load}
      />

      <ConfirmDialog {...confirmProps} />
    </div>
  )
}