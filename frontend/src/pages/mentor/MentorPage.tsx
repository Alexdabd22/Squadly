import { useEffect, useState } from 'react'
import { Inbox, Users, Eye, Unlock, Lock, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client'
import type { TaskItem, MentorProject } from '../../types'
import {
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_BADGE,
} from '../../constants/task'
import { formatRelativeTime } from '../../utils/date'
import { colorByValue } from '../../constants/project'
import TaskDetailsModal from '../../components/tasks/TaskDetailsModal'

type Tab = 'review' | 'projects'

interface ReviewTask {
  id: string
  title: string
  description?: string
  priority: 'Low' | 'Medium' | 'High'
  dueDate?: string
  createdAt: string
  updatedAt?: string
  project: {
    id: string
    title: string
    color: string
    category: string
  } | null
  assignee: {
    id: string
    fullName: string
    email: string
  } | null
  reviewClaimedByUserId: string | null
  reviewClaimedByName: string | null
  reviewClaimedAt: string | null
}

export default function MentorPage() {
  const [tab, setTab] = useState<Tab>('review')

  const [reviewTasks, setReviewTasks] = useState<ReviewTask[]>([])
  const [reviewLoading, setReviewLoading] = useState(true)

  const [projects, setProjects] = useState<MentorProject[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)

  const [error, setError] = useState('')
  const [detailTask, setDetailTask] = useState<TaskItem | null>(null)

  const currentUserId = sessionStorage.getItem('userId')
  const navigate = useNavigate()

  useEffect(() => { loadReviewQueue() }, [])

  useEffect(() => {
    if (tab === 'projects' && projects.length === 0) loadProjects()
  }, [tab])

  const loadReviewQueue = async () => {
    setReviewLoading(true)
    setError('')
    try {
      const res = await api.get<ReviewTask[]>('/mentor/review-queue')
      setReviewTasks(res.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити чергу перевірок')
    } finally {
      setReviewLoading(false)
    }
  }

  const loadProjects = async () => {
    setProjectsLoading(true)
    try {
      const res = await api.get<MentorProject[]>('/mentor/projects')
      setProjects(res.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити проєкти')
    } finally {
      setProjectsLoading(false)
    }
  }

  const handleClaim = async (taskId: string) => {
    try {
      await api.post(`/tasks/${taskId}/claim-review`)
      loadReviewQueue()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося взяти на перевірку')
    }
  }

  const handleRelease = async (taskId: string) => {
    try {
      await api.post(`/tasks/${taskId}/release-review`)
      loadReviewQueue()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося звільнити')
    }
  }

  const openDetails = (rt: ReviewTask) => {
    const task: TaskItem = {
      id: rt.id,
      title: rt.title,
      description: rt.description,
      status: 'InReview',
      priority: rt.priority,
      project: rt.project ? { id: rt.project.id, title: rt.project.title } : undefined,
      assignee: rt.assignee
        ? { id: rt.assignee.id, fullName: rt.assignee.fullName, email: rt.assignee.email }
        : undefined,
      reviewClaimedByUserId: rt.reviewClaimedByUserId,
      reviewClaimedByUser: rt.reviewClaimedByName
        ? {
            id: rt.reviewClaimedByUserId ?? '',
            firstName: rt.reviewClaimedByName.split(' ')[0] ?? '',
            lastName: rt.reviewClaimedByName.split(' ').slice(1).join(' ') ?? '',
            fullName: rt.reviewClaimedByName,
          }
        : null,
      reviewClaimedAt: rt.reviewClaimedAt ?? null,
      dueDate: rt.dueDate,
      createdAt: rt.createdAt,
    }
    setDetailTask(task)
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Менторство</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Центр перевірки задач та активність ваших проєктів
        </p>
      </div>

      <div className="flex gap-1 border-b border-slate-200 mb-6">
        <button
          onClick={() => setTab('review')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors inline-flex items-center gap-1.5 ${
            tab === 'review'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Inbox className="w-4 h-4" />
          Очікують перевірки
          {reviewTasks.length > 0 && (
            <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
              tab === 'review' ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {reviewTasks.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('projects')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors inline-flex items-center gap-1.5 ${
            tab === 'projects'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Активність по проєктах
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      {/* ─── Очікують перевірки ─── */}
      {tab === 'review' && (
        <>
          {reviewLoading ? (
            <div className="text-slate-500 text-sm p-4">Завантаження…</div>
          ) : reviewTasks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Inbox className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">Усе перевірено!</p>
              <p className="text-sm text-slate-400 mt-1">
                Немає задач, що чекають вашої перевірки
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviewTasks.map((task) => {
                const projectColor = task.project ? colorByValue(task.project.color as any) : null
                const isClaimed = !!task.reviewClaimedByUserId
                const isClaimedByMe = task.reviewClaimedByUserId === currentUserId

                return (
                  <div
                    key={task.id}
                    className={`relative bg-white rounded-2xl border overflow-hidden hover:shadow-md transition ${
                      isClaimedByMe ? 'border-primary-300' : 'border-slate-200'
                    }`}
                  >
                    {projectColor && (
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${projectColor.bar}`} />
                    )}

                    <div className="p-5 pl-6">
                      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                        <div onClick={() => openDetails(task)} className="flex-1 min-w-0 cursor-pointer">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {task.project && projectColor && (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigate(`/projects/${task.project!.id}`)
                                }}
                                className={`text-xs px-2 py-0.5 rounded font-medium hover:underline cursor-pointer ${projectColor.bg} ${projectColor.text}`}
                              >
                                {task.project.title}
                              </span>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${TASK_PRIORITY_BADGE[task.priority]}`}>
                              {TASK_PRIORITY_LABEL[task.priority]}
                            </span>
                          </div>
                          <h3 className="font-semibold text-slate-900 hover:text-primary-700">
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                              {task.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!isClaimed && (
                            <button
                              onClick={() => handleClaim(task.id)}
                              className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
                            >
                              <Eye className="w-4 h-4" />
                              Взяти
                            </button>
                          )}

                          {isClaimedByMe && (
                            <>
                              <button
                                onClick={() => openDetails(task)}
                                className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
                              >
                                <Eye className="w-4 h-4" />
                                Рішення
                              </button>
                              <button
                                onClick={() => handleRelease(task.id)}
                                className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium"
                              >
                                <Unlock className="w-4 h-4" />
                                Відпустити
                              </button>
                            </>
                          )}

                          {isClaimed && !isClaimedByMe && (
                            <div className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-500 px-3 py-1.5 rounded-lg text-sm">
                              <Lock className="w-4 h-4" />
                              {task.reviewClaimedByName} перевіряє
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-3">
                          {task.assignee && (
                            <span className="inline-flex items-center gap-1">
                              <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-[10px] font-semibold">
                                {task.assignee.fullName[0]?.toUpperCase()}
                              </div>
                              Здав: <span className="text-slate-700 font-medium">{task.assignee.fullName}</span>
                            </span>
                          )}
                          {task.updatedAt && <span>· {formatRelativeTime(task.updatedAt)}</span>}
                        </div>

                        <button
                          onClick={() => openDetails(task)}
                          className="text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1"
                        >
                          Деталі
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ─── Активність по проєктах ─── */}
      {tab === 'projects' && (
        <>
          {projectsLoading ? (
            <div className="text-slate-500 text-sm p-4">Завантаження…</div>
          ) : projects.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">Ви не ментор у жодному проєкті</p>
              <p className="text-sm text-slate-400 mt-1">
                Організатор має призначити вас ментором у налаштуваннях проєкту
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {projects.map((p) => {
                const progress = p.totalTasks > 0
                  ? Math.round((p.completedTasks / p.totalTasks) * 100)
                  : 0
                return (
                  <button
                    key={p.projectId}
                    onClick={() => navigate(`/mentor/project/${p.projectId}`)}
                    className="bg-white rounded-2xl border border-slate-200 p-5 text-left hover:border-primary-300 hover:shadow-md transition group"
                  >
                    <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-primary-700">
                      {p.title}
                    </h3>
                    {p.description && (
                      <p className="text-sm text-slate-500 line-clamp-2 mb-3">{p.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                      <span>{p.totalMembers} учасників</span>
                      <span>·</span>
                      <span>{p.totalTasks} задач</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-primary-500 to-primary-600 h-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5">
                      {p.completedTasks}/{p.totalTasks} виконано ({progress}%)
                    </p>
                    <p className="text-xs text-primary-600 mt-2 font-medium inline-flex items-center gap-1">
                      Відкрити підопічних
                      <ChevronRight className="w-3 h-3" />
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      <TaskDetailsModal
        open={detailTask !== null}
        task={detailTask}
        onClose={() => { setDetailTask(null); loadReviewQueue() }}
        onChanged={loadReviewQueue}
      />
    </div>
  )
}