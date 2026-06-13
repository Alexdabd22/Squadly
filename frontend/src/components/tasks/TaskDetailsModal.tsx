import { useEffect, useState } from 'react'
import {
  X,
  Clock,
  User as UserIcon,
  Calendar,
  FolderOpen,
  Link as LinkIcon,
} from 'lucide-react'
import api from '../../api/client'
import type { TaskItem, TaskSubmission } from '../../types'
import {
  TASK_STATUS_LABEL,
  TASK_STATUS_BADGE,
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_BADGE,
} from '../../constants/task'
import TaskComments from './TaskComments'
import TaskAttachments from '../common/TaskAttachments'
import { formatRelativeTime } from '../../utils/date'

interface Props {
  open: boolean
  task: TaskItem | null
  onClose: () => void
  onChanged: () => void
}

export default function TaskDetailsModal({ open, task, onClose, onChanged }: Props) {
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([])
  const [loadingSubs, setLoadingSubs] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'submissions' | 'comments' | 'files'>('info')

  useEffect(() => {
    if (!open || !task) return
    setActiveTab('info')
    loadSubmissions()
  }, [open, task?.id])

  const loadSubmissions = async () => {
    if (!task) return
    setLoadingSubs(true)
    try {
      const res = await api.get<TaskSubmission[]>(`/tasks/${task.id}/submissions`)
      setSubmissions(res.data)
    } catch {
      setSubmissions([])
    } finally {
      setLoadingSubs(false)
    }
  }

  if (!open || !task) return null

  const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Done'

  const tabs = [
    { key: 'info' as const, label: 'Інформація' },
    { key: 'submissions' as const, label: `Здачі (${submissions.length})` },
    { key: 'comments' as const, label: `Коментарі (${task.comments?.length ?? 0})` },
    { key: 'files' as const, label: 'Файли' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${TASK_STATUS_BADGE[task.status]}`}>
                {TASK_STATUS_LABEL[task.status]}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${TASK_PRIORITY_BADGE[task.priority]}`}>
                {TASK_PRIORITY_LABEL[task.priority]}
              </span>
              {task.pointsAwarded && (
                <span className="text-xs px-2 py-0.5 rounded font-medium bg-green-100 text-green-700">
                  Бали нараховано
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-900 break-words">{task.title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-200 px-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === t.key
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'info' && (
            <div className="space-y-4">
              {task.description && (
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Опис</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{task.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <InfoRow icon={UserIcon} label="Виконавець" value={task.assignee?.fullName || 'Не призначено'} />
                <InfoRow icon={FolderOpen} label="Проєкт" value={task.project?.title || '—'} />
                <InfoRow
                  icon={Calendar}
                  label="Дедлайн"
                  value={task.dueDate ? new Date(task.dueDate).toLocaleDateString('uk-UA') : 'Не задано'}
                  highlight={overdue ? 'text-red-600' : undefined}
                />
                <InfoRow icon={Clock} label="Створено" value={formatRelativeTime(task.createdAt)} />
              </div>

              {task.status === 'NeedsRevision' && task.reviewComment && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm font-medium text-amber-800 mb-1">Причина повернення</p>
                  <p className="text-sm text-amber-700">{task.reviewComment}</p>
                </div>
              )}

              {task.status === 'InReview' && task.reviewClaimedByUser && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <p className="text-sm text-purple-700">
                    Перевіряє: <span className="font-medium">{task.reviewClaimedByUser.fullName}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'submissions' && (
            <div>
              {loadingSubs ? (
                <p className="text-slate-500 text-sm">Завантаження…</p>
              ) : submissions.length === 0 ? (
                <p className="text-slate-400 text-sm py-8 text-center">Здач поки немає</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
                  <div className="space-y-4">
                    {submissions.map((sub) => (
                      <div key={sub.id} className="relative pl-10">
                        <div className="absolute left-2.5 top-2 w-3 h-3 rounded-full bg-primary-500 border-2 border-white" />
                        <div className="bg-slate-50 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-slate-900">
                              Спроба #{sub.submissionNumber}
                            </span>
                            <span className="text-xs text-slate-500">
                              {formatRelativeTime(sub.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 mb-1">
                            Здав(ла): <span className="text-slate-700">{sub.submittedBy}</span>
                          </p>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap mb-2">
                            {sub.whatWasDone}
                          </p>
                          {sub.hoursSpent != null && (
                            <p className="text-xs text-slate-500 mb-1">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {sub.hoursSpent} год.
                            </p>
                          )}
                          {sub.links.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                             {sub.links.map((link, i) => (
                                <a
                                    key={i}
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-0.5 rounded"
                                >
                                    <LinkIcon className="w-3 h-3" />
                                    {link.length > 40 ? link.substring(0, 40) + '…' : link}
                                </a>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'comments' && (
            <TaskComments
              taskId={task.id}
              comments={task.comments ?? []}
              onChanged={onChanged}
            />
          )}

          {activeTab === 'files' && (
            <TaskAttachments taskId={task.id} />
          )}
        </div>
      </div>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof UserIcon
  label: string
  value: string
  highlight?: string
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className={`text-sm font-medium ${highlight || 'text-slate-900'}`}>{value}</p>
      </div>
    </div>
  )
}