import { useEffect, useState } from 'react'
import {
  X, Clock, User as UserIcon, Calendar, FolderOpen, Link as LinkIcon,
  Send, Check, Undo2, Eye,
} from 'lucide-react'
import api from '../../api/client'
import type { TaskItem, TaskSubmission, TaskComment } from '../../types'
import {
  TASK_STATUS_LABEL, TASK_STATUS_BADGE,
  TASK_PRIORITY_LABEL, TASK_PRIORITY_BADGE,
} from '../../constants/task'
import TaskComments from './TaskComments'
import TaskAttachments from '../common/TaskAttachments'
import SubmitTaskModal from './SubmitTaskModal'
import { formatRelativeTime } from '../../utils/date'

interface Props {
  open: boolean
  task: TaskItem | null
  onClose: () => void
  onChanged: () => void
  /** роль поточного юзера в проєкті задачі: 'Organizer' | 'Mentor' | 'Participant' */
  userRole?: string
}

export default function TaskDetailsModal({ open, task, onClose, onChanged, userRole }: Props) {
  const [fresh, setFresh] = useState<TaskItem | null>(null)
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([])
  const [comments, setComments] = useState<TaskComment[]>([])
  const [loadingSubs, setLoadingSubs] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'submissions' | 'comments' | 'files'>('info')

  const [submitOpen, setSubmitOpen] = useState(false)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewLoading, setReviewLoading] = useState<'accept' | 'return' | null>(null)
  const [error, setError] = useState('')

  const currentUserId = sessionStorage.getItem('userId')

  useEffect(() => {
    if (!open || !task) return
    setActiveTab('info')
    setReviewComment('')
    setError('')
    setFresh(task)
    reload()
  }, [open, task?.id])

  const reload = async () => {
    if (!task) return
    setLoadingSubs(true)
    try {
      const [subsRes, taskRes] = await Promise.all([
        api.get<TaskSubmission[]>(`/tasks/${task.id}/submissions`),
        api.get<TaskItem>(`/tasks/${task.id}`),
      ])
      setSubmissions(subsRes.data)
      setFresh(taskRes.data)
      setComments(taskRes.data.comments ?? [])
    } catch {
      setComments(task.comments ?? [])
    } finally {
      setLoadingSubs(false)
    }
  }

  if (!open || !task) return null

  const t = fresh ?? task
  const overdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Done'

  const isMyTask = t.assignee?.id === currentUserId
  const canSubmit = isMyTask && (t.status === 'InProgress' || t.status === 'NeedsRevision')

  const isReviewer = userRole === 'Mentor' || userRole === 'Organizer'
  const isClaimedByMe = t.reviewClaimedByUserId === currentUserId
  const canDecide = t.status === 'InReview' && isReviewer && (isClaimedByMe || userRole === 'Organizer')

  const handleAccept = async () => {
    setReviewLoading('accept')
    setError('')
    try {
      await api.post(`/tasks/${t.id}/accept`, { comment: reviewComment.trim() || null })
      onChanged()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося прийняти')
    } finally {
      setReviewLoading(null)
    }
  }

  const handleReturn = async () => {
    if (!reviewComment.trim()) {
      setError('Вкажіть причину повернення')
      return
    }
    setReviewLoading('return')
    setError('')
    try {
      await api.post(`/tasks/${t.id}/return`, { comment: reviewComment.trim() })
      onChanged()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося повернути')
    } finally {
      setReviewLoading(null)
    }
  }

  const handleClaim = async () => {
    setError('')
    try {
      await api.post(`/tasks/${t.id}/claim-review`)
      reload()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося взяти на перевірку')
    }
  }

  const tabs = [
    { key: 'info' as const, label: 'Інформація' },
    { key: 'submissions' as const, label: `Здачі (${submissions.length})` },
    { key: 'comments' as const, label: `Коментарі (${comments.length})` },
    { key: 'files' as const, label: 'Файли' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${TASK_STATUS_BADGE[t.status]}`}>
                {TASK_STATUS_LABEL[t.status]}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${TASK_PRIORITY_BADGE[t.priority]}`}>
                {TASK_PRIORITY_LABEL[t.priority]}
              </span>
              {t.pointsAwarded && (
                <span className="text-xs px-2 py-0.5 rounded font-medium bg-green-100 text-green-700">
                  Бали нараховано
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-900 break-words">{t.title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setActiveTab(tb.key)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tb.key
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-4">
              {error}
            </div>
          )}

          {activeTab === 'info' && (
            <div className="space-y-4">
              {t.description && (
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Опис</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{t.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <InfoRow icon={UserIcon} label="Виконавець" value={t.assignee?.fullName || 'Не призначено'} />
                <InfoRow icon={FolderOpen} label="Проєкт" value={t.project?.title || '—'} />
                <InfoRow
                  icon={Calendar}
                  label="Дедлайн"
                  value={t.dueDate ? new Date(t.dueDate).toLocaleDateString('uk-UA') : 'Не задано'}
                  highlight={overdue ? 'text-red-600' : undefined}
                />
                <InfoRow icon={Clock} label="Створено" value={formatRelativeTime(t.createdAt)} />
              </div>

              {t.status === 'NeedsRevision' && t.reviewComment && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm font-medium text-amber-800 mb-1">Причина повернення</p>
                  <p className="text-sm text-amber-700">{t.reviewComment}</p>
                </div>
              )}

              {t.status === 'InReview' && t.reviewClaimedByUser && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <p className="text-sm text-purple-700">
                    Перевіряє: <span className="font-medium">{t.reviewClaimedByUser.fullName}</span>
                  </p>
                </div>
              )}

              {/* Кнопка «Здати» для виконавця */}
              {canSubmit && (
                <button
                  onClick={() => setSubmitOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium"
                >
                  <Send className="w-4 h-4" />
                  Здати на перевірку
                </button>
              )}

              {/* Ментор: взяти на перевірку */}
              {t.status === 'InReview' && isReviewer && !t.reviewClaimedByUserId && (
                <button
                  onClick={handleClaim}
                  className="w-full inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium"
                >
                  <Eye className="w-4 h-4" />
                  Взяти на перевірку
                </button>
              )}

              {/* Блок рішення для ментора */}
              {canDecide && (
                <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-700">Рішення по задачі</p>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="Коментар (обов'язковий при поверненні)…"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleReturn}
                      disabled={reviewLoading !== null}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      <Undo2 className="w-4 h-4" />
                      {reviewLoading === 'return' ? 'Повернення…' : 'Повернути'}
                    </button>
                    <button
                      onClick={handleAccept}
                      disabled={reviewLoading !== null}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      {reviewLoading === 'accept' ? 'Прийняття…' : 'Прийняти'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'submissions' && (
            <div>
              {loadingSubs ? (
                <p className="text-slate-500 text-sm">Завантаження…</p>
              ) : submissions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-400 text-sm mb-3">Здач поки немає</p>
                  {canSubmit && (
                    <button
                      onClick={() => setSubmitOpen(true)}
                      className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      <Send className="w-4 h-4" />
                      Здати на перевірку
                    </button>
                  )}
                </div>
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
              taskId={t.id}
              comments={comments}
              onChanged={reload}
            />
          )}

          {activeTab === 'files' && (
            <TaskAttachments taskId={t.id} />
          )}
        </div>
      </div>

      {/* Модалка здачі поверх деталей */}
      {submitOpen && (
        <SubmitTaskModal
          open={true}
          taskId={t.id}
          taskTitle={t.title}
          onClose={() => setSubmitOpen(false)}
          onSubmitted={() => {
            setSubmitOpen(false)
            reload()
            onChanged()
          }}
        />
      )}
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