import { useEffect, useState, useRef, DragEvent } from 'react'
import { Plus, Pencil, Trash2, Send, Eye, Lock, Unlock } from 'lucide-react'
import * as signalR from '@microsoft/signalr'
import api from '../../api/client'
import type { TaskItem, TaskStatus } from '../../types'
import {
  KANBAN_COLUMNS,
  TASK_STATUS_LABEL,
  TASK_STATUS_BADGE,
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_BADGE,
  KANBAN_COLUMN_BG,
  KANBAN_COLUMN_HEADER,
} from '../../constants/task'
import TaskFormModal from '../tasks/TaskFormModal'
import SubmitTaskModal from '../tasks/SubmitTaskModal'
import ReviewTaskModal from '../tasks/ReviewTaskModal'
import ConfirmDialog from '../common/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'
import TaskDetailsModal from '../tasks/TaskDetailsModal'

interface Props {
  projectId: string
  canManage: boolean
  userRole?: string
}

export default function ProjectKanbanTab({ projectId, canManage, userRole }: Props) {
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [formInitial, setFormInitial] = useState<TaskItem | null>(null)
  const [formDefaultStatus, setFormDefaultStatus] = useState<TaskStatus>('ToDo')

  const [submitModal, setSubmitModal] = useState<{ taskId: string; taskTitle: string } | null>(null)
  const [reviewModal, setReviewModal] = useState<{ taskId: string; taskTitle: string } | null>(null)

  const { confirm, confirmProps } = useConfirm()
  const connectionRef = useRef<signalR.HubConnection | null>(null)
  const currentUserId = sessionStorage.getItem('userId')
  const isReviewer = userRole === 'Mentor' || userRole === 'Organizer'
  const [detailTask, setDetailTask] = useState<TaskItem | null>(null)

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

  // ─── SignalR ───

  useEffect(() => {
    load()
    setupSignalR()
    return () => { teardownSignalR() }
  }, [projectId])

  const setupSignalR = async () => {
    const token = sessionStorage.getItem('token')
    const connection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5176/hubs/chat', { accessTokenFactory: () => token || '' })
      .withAutomaticReconnect()
      .build()

    connection.on('TaskStatusChanged', (data: { taskId: string; status: TaskStatus }) => {
      setTasks((prev) => prev.map((t) => (t.id === data.taskId ? { ...t, status: data.status } : t)))
    })

    connection.on('TaskReviewClaimed', (data: { taskId: string; claimedByUserId: string; claimedByName: string }) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === data.taskId
            ? {
                ...t,
                reviewClaimedByUserId: data.claimedByUserId,
                reviewClaimedByUser: {
                  id: data.claimedByUserId,
                  firstName: data.claimedByName.split(' ')[0] || '',
                  lastName: data.claimedByName.split(' ')[1] || '',
                  fullName: data.claimedByName,
                },
              }
            : t
        )
      )
    })

    connection.on('TaskReviewReleased', (data: { taskId: string }) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === data.taskId ? { ...t, reviewClaimedByUserId: null, reviewClaimedByUser: null } : t
        )
      )
    })

    try {
      await connection.start()
      await connection.invoke('JoinProject', projectId)
      connectionRef.current = connection
    } catch (err) {
      console.error('SignalR error:', err)
    }
  }

  const teardownSignalR = async () => {
    if (connectionRef.current) {
      try {
        await connectionRef.current.invoke('LeaveProject', projectId).catch(() => {})
        await connectionRef.current.stop()
      } catch { /* ignore */ }
      connectionRef.current = null
    }
  }

  // ─── Actions ───

  const openCreate = (status: TaskStatus) => {
    setFormMode('create')
    setFormInitial(null)
    setFormDefaultStatus(status)
    setFormOpen(true)
  }

  const openEdit = (task: TaskItem) => {
    setFormMode('edit')
    setFormInitial(task)
    setFormOpen(true)
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

  const handleClaimReview = async (task: TaskItem) => {
    try {
      await api.post(`/tasks/${task.id}/claim-review`)
      load()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося взяти на перевірку')
    }
  }

  const handleReleaseReview = async (task: TaskItem) => {
    try {
      await api.post(`/tasks/${task.id}/release-review`)
      load()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося звільнити')
    }
  }

  // ─── DnD ───

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

    if (newStatus === 'InReview') {
      setError('Для переведення в «На перевірці» використовуйте кнопку «Здати»')
      return
    }
    if (task.status === 'InReview' && !isReviewer) {
      setError('Задачу на перевірці може змінити тільки ментор або організатор')
      return
    }

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

  // ─── Helpers ───

  const getColumnTasks = (status: TaskStatus): TaskItem[] => {
    if (status === 'InProgress') {
      return tasks.filter((t) => t.status === 'InProgress' || t.status === 'NeedsRevision')
    }
    return tasks.filter((t) => t.status === status)
  }

  if (loading) return <div className="text-slate-500 text-sm p-4">Завантаження задач…</div>

  return (
    <div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-3 text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-2 text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {KANBAN_COLUMNS.map((status) => {
          const columnTasks = getColumnTasks(status)
          const dragOver = dragOverStatus === status
          return (
            <div
              key={status}
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={() => setDragOverStatus(null)}
              onDrop={(e) => handleDrop(e, status)}
              className={`rounded-2xl border-2 transition-colors p-3 min-h-[300px] ${KANBAN_COLUMN_BG[status]} ${
                dragOver ? 'border-primary-400' : 'border-transparent'
              }`}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className={`font-semibold text-sm ${KANBAN_COLUMN_HEADER[status]}`}>
                  {TASK_STATUS_LABEL[status]}{' '}
                  <span className="text-slate-400 font-normal">({columnTasks.length})</span>
                </h3>
                {status !== 'InReview' && status !== 'Done' && (
                  <button onClick={() => openCreate(status)} className="text-slate-400 hover:text-primary-600" title="Додати задачу">
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {columnTasks.map((task) => {
                  const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Done'
                  const isMyTask = task.assignee?.id === currentUserId
                  const isNeedsRevision = task.status === 'NeedsRevision'
                  const isInReview = task.status === 'InReview'
                  const isClaimed = !!task.reviewClaimedByUserId
                  const isClaimedByMe = task.reviewClaimedByUserId === currentUserId

                  return (
                    <div
                      key={task.id}
                      draggable={status !== 'InReview'}
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      className={`bg-white rounded-xl border p-3 shadow-sm hover:shadow-md transition ${
                        isNeedsRevision ? 'border-amber-300' : 'border-slate-200'
                      } ${status !== 'InReview' ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    >
                      {/* Бейдж NeedsRevision */}
                      {isNeedsRevision && (
                        <div className="mb-2">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${TASK_STATUS_BADGE.NeedsRevision}`}>
                            Потребує доопрацювання
                          </span>
                          {task.reviewComment && (
                            <p className="text-xs text-amber-700 mt-1 bg-amber-50 rounded px-2 py-1">
                              {task.reviewComment}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Claim banner для InReview */}
                      {isInReview && isClaimed && (
                        <div className="mb-2 flex items-center gap-1.5 text-xs bg-purple-50 text-purple-700 rounded px-2 py-1">
                          <Lock className="w-3 h-3" />
                          {isClaimedByMe
                            ? 'Ви перевіряєте'
                            : `${task.reviewClaimedByUser?.fullName || 'Хтось'} перевіряє`}
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4
                        className="font-medium text-sm text-slate-900 break-words cursor-pointer hover:text-primary-600"
                        onClick={(e) => { e.stopPropagation(); setDetailTask(task) }}
                        >
                        {task.title}
                        </h4>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${TASK_PRIORITY_BADGE[task.priority]}`}>
                          {TASK_PRIORITY_LABEL[task.priority]}
                        </span>
                      </div>

                      {task.description && (
                        <p className="text-xs text-slate-500 mb-2 line-clamp-2">{task.description}</p>
                      )}

                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="truncate">{task.assignee?.fullName || 'Без виконавця'}</span>
                        {task.dueDate && (
                          <span className={overdue ? 'text-red-600 font-medium' : ''}>
                            {new Date(task.dueDate).toLocaleDateString('uk-UA')}
                          </span>
                        )}
                      </div>

                      {/* Дії */}
                      <div className="flex gap-1 mt-2 pt-2 border-t border-slate-100 flex-wrap">
                        {/* Учасник: кнопка «Здати» */}
                        {isMyTask && (task.status === 'InProgress' || isNeedsRevision) && (
                          <button
                            onClick={() => setSubmitModal({ taskId: task.id, taskTitle: task.title })}
                            className="text-xs text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" />
                            Здати
                          </button>
                        )}

                        {/* Ментор/Організатор: кнопки перевірки */}
                        {isReviewer && isInReview && !isClaimed && (
                          <button
                            onClick={() => handleClaimReview(task)}
                            className="text-xs text-purple-600 hover:text-purple-700 inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            Перевірити
                          </button>
                        )}

                        {isReviewer && isInReview && isClaimedByMe && (
                          <>
                            <button
                              onClick={() => setReviewModal({ taskId: task.id, taskTitle: task.title })}
                              className="text-xs text-green-600 hover:text-green-700 inline-flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              Рішення
                            </button>
                            <button
                              onClick={() => handleReleaseReview(task)}
                              className="text-xs text-slate-500 hover:text-slate-700 inline-flex items-center gap-1"
                            >
                              <Unlock className="w-3 h-3" />
                              Відпустити
                            </button>
                          </>
                        )}

                        {/* Редагувати / Видалити */}
                        <button onClick={() => openEdit(task)} className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 ml-auto">
                          <Pencil className="w-3 h-3" />
                        </button>
                        {canManage && (
                          <button onClick={() => handleDelete(task)} className="text-xs text-red-600 hover:text-red-700 inline-flex items-center gap-1">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
                {columnTasks.length === 0 && (
                  <p className="text-center text-xs text-slate-400 py-6">
                    {status === 'InReview' ? 'Немає задач на перевірці' : 'Перетягни сюди'}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <TaskFormModal
        open={formOpen}
        mode={formMode}
        projectId={projectId}
        initial={formInitial}
        defaultStatus={formDefaultStatus}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />

      {submitModal && (
        <SubmitTaskModal
          open={true}
          taskId={submitModal.taskId}
          taskTitle={submitModal.taskTitle}
          onClose={() => setSubmitModal(null)}
          onSubmitted={load}
        />
      )}

      {reviewModal && (
        <ReviewTaskModal
          open={true}
          taskId={reviewModal.taskId}
          taskTitle={reviewModal.taskTitle}
          onClose={() => setReviewModal(null)}
          onReviewed={load}
        />
      )}
         <TaskDetailsModal
        open={detailTask !== null}
        task={detailTask}
        onClose={() => setDetailTask(null)}
        onChanged={load}
      />
      <ConfirmDialog {...confirmProps} />
    </div>
  )
}