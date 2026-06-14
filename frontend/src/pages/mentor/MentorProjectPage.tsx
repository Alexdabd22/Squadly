import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Users, FileText, Pencil, Trash2, Plus, Save, X,
  CheckSquare, Clock, AlertCircle, ListChecks,
} from 'lucide-react'
import api from '../../api/client'
import type { Mentee, MentorNote, TaskItem, MentorProject } from '../../types'
import { formatRelativeTime } from '../../utils/date'
import {
  TASK_STATUS_LABEL, TASK_STATUS_BADGE,
  TASK_PRIORITY_LABEL, TASK_PRIORITY_BADGE,
} from '../../constants/task'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'
import TaskDetailsModal from '../../components/tasks/TaskDetailsModal'

type View = 'mentees' | 'mentee-detail'
type MenteeTab = 'tasks' | 'notes'

export default function MentorProjectPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<MentorProject | null>(null)
  const [mentees, setMentees] = useState<Mentee[]>([])
  const [selectedMentee, setSelectedMentee] = useState<Mentee | null>(null)
  const [menteeTab, setMenteeTab] = useState<MenteeTab>('tasks')
  const [view, setView] = useState<View>('mentees')

  const [menteeTasks, setMenteeTasks] = useState<TaskItem[]>([])
  const [notes, setNotes] = useState<MentorNote[]>([])

  const [loading, setLoading] = useState(true)
  const [tasksLoading, setTasksLoading] = useState(false)
  const [error, setError] = useState('')

  const [noteText, setNoteText] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')

  const [detailTask, setDetailTask] = useState<TaskItem | null>(null)

  const { confirm, confirmProps } = useConfirm()

  useEffect(() => {
    if (!projectId) return
    loadAll()
  }, [projectId])

  const loadAll = async () => {
    setLoading(true)
    setError('')
    try {
      // Знаходимо проєкт серед моїх (Mentor)
      const projectsRes = await api.get<MentorProject[]>('/mentor/projects')
      const found = projectsRes.data.find((p) => p.projectId === projectId)
      if (!found) {
        setError('Ви не є ментором цього проєкту')
        setLoading(false)
        return
      }
      setProject(found)

      const menteesRes = await api.get<Mentee[]>(`/mentor/projects/${projectId}/mentees`)
      setMentees(menteesRes.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити дані')
    } finally {
      setLoading(false)
    }
  }

  const openMenteeDetail = async (mentee: Mentee) => {
    setSelectedMentee(mentee)
    setMenteeTab('tasks')
    setView('mentee-detail')
    await loadMenteeTasks(mentee)
    await loadNotes(mentee)
  }

  const loadMenteeTasks = async (mentee: Mentee) => {
    if (!projectId) return
    setTasksLoading(true)
    try {
      const response = await api.get<TaskItem[]>(`/tasks?projectId=${projectId}`)
      setMenteeTasks(response.data.filter((t) => t.assignee?.id === mentee.userId))
    } catch {
      setMenteeTasks([])
    } finally {
      setTasksLoading(false)
    }
  }

  const loadNotes = async (mentee: Mentee) => {
    if (!projectId) return
    try {
      const response = await api.get<MentorNote[]>(`/mentor/notes/${mentee.userId}/${projectId}`)
      setNotes(response.data)
    } catch {
      setNotes([])
    }
  }

  const handleAddNote = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!noteText.trim() || !projectId || !selectedMentee) return
    try {
      const response = await api.post<MentorNote>('/mentor/notes', {
        aboutUserId: selectedMentee.userId,
        projectId,
        content: noteText.trim(),
      })
      setNotes((prev) => [response.data, ...prev])
      setNoteText('')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося додати нотатку')
    }
  }

  const startEditNote = (note: MentorNote) => {
    setEditingNoteId(note.id)
    setEditingText(note.content)
  }

  const cancelEditNote = () => {
    setEditingNoteId(null)
    setEditingText('')
  }

  const handleUpdateNote = async (noteId: string) => {
    if (!editingText.trim()) return
    try {
      const response = await api.put<MentorNote>(`/mentor/notes/${noteId}`, { content: editingText.trim() })
      setNotes((prev) => prev.map((n) => (n.id === noteId ? response.data : n)))
      setEditingNoteId(null)
      setEditingText('')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося оновити')
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    const ok = await confirm({
      title: 'Видалення нотатки',
      message: 'Видалити цю нотатку?',
      confirmText: 'Видалити',
      confirmVariant: 'danger',
    })
    if (!ok) return
    try {
      await api.delete(`/mentor/notes/${noteId}`)
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося видалити')
    }
  }

  const statusIcon = (status: string) => {
    if (status === 'Done') return <CheckSquare className="w-4 h-4 text-green-600" />
    if (status === 'InReview') return <Clock className="w-4 h-4 text-purple-600" />
    if (status === 'NeedsRevision') return <AlertCircle className="w-4 h-4 text-amber-600" />
    if (status === 'InProgress') return <Clock className="w-4 h-4 text-blue-600" />
    return <ListChecks className="w-4 h-4 text-slate-400" />
  }

  if (loading) return <div className="max-w-5xl mx-auto p-6 text-slate-500">Завантаження…</div>

  if (error && !project) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-4">{error}</div>
        <Link to="/mentor" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
          ← До менторства
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Хлібні крихти */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4 flex-wrap">
        <Link to="/mentor" className="hover:text-primary-600">Менторство</Link>
        <span>/</span>
        <button
          onClick={() => { setView('mentees'); setSelectedMentee(null) }}
          className={`hover:text-primary-600 truncate max-w-[200px] ${view === 'mentees' ? 'text-primary-600 font-medium' : ''}`}
        >
          {project?.title}
        </button>
        {selectedMentee && (
          <>
            <span>/</span>
            <span className="text-primary-600 font-medium truncate max-w-[200px]">{selectedMentee.fullName}</span>
          </>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      {/* ────── ПІДОПІЧНІ ────── */}
      {view === 'mentees' && project && (
        <>
          <button
            onClick={() => navigate('/mentor')}
            className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            До менторства
          </button>

          <h1 className="text-2xl font-bold text-slate-900 mb-1 flex items-center gap-2">
            <Users className="w-6 h-6 text-primary-600" />
            Підопічні
          </h1>
          <p className="text-sm text-slate-500 mb-5">Проєкт: <strong>{project.title}</strong></p>

          {mentees.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500">Поки немає підопічних у цьому проєкті</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mentees.map((mentee) => {
                const progress = mentee.totalTasks > 0
                  ? Math.round((mentee.completedTasks / mentee.totalTasks) * 100)
                  : 0
                return (
                  <button
                    key={mentee.userId}
                    onClick={() => openMenteeDetail(mentee)}
                    className="w-full bg-white rounded-2xl border border-slate-200 p-5 text-left hover:border-primary-300 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-lg flex-shrink-0">
                        {mentee.fullName[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="font-semibold text-slate-900 group-hover:text-primary-700">{mentee.fullName}</p>
                            <p className="text-xs text-slate-500">{mentee.email}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 ${
                            mentee.role === 'Organizer' ? 'bg-amber-100 text-amber-700' :
                            mentee.role === 'Mentor' ? 'bg-purple-100 text-purple-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {mentee.role === 'Organizer' ? 'Організатор' : mentee.role === 'Mentor' ? 'Ментор' : 'Учасник'}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 mb-3 text-center text-xs">
                          <div className="bg-slate-50 rounded-lg p-2">
                            <p className="text-slate-500">Всього</p>
                            <p className="font-bold text-slate-900 text-base">{mentee.totalTasks}</p>
                          </div>
                          <div className="bg-green-50 rounded-lg p-2">
                            <p className="text-green-600">Виконано</p>
                            <p className="font-bold text-green-700 text-base">{mentee.completedTasks}</p>
                          </div>
                          <div className="bg-blue-50 rounded-lg p-2">
                            <p className="text-blue-600">В роботі</p>
                            <p className="font-bold text-blue-700 text-base">{mentee.inProgressTasks}</p>
                          </div>
                          <div className="bg-amber-50 rounded-lg p-2">
                            <p className="text-amber-600">Балів</p>
                            <p className="font-bold text-amber-700 text-base">{mentee.totalPoints}</p>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-primary-500 to-primary-600 h-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{progress}% виконано</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ────── ДЕТАЛІ ПІДОПІЧНОГО ────── */}
      {view === 'mentee-detail' && selectedMentee && project && (
        <>
          <button
            onClick={() => { setView('mentees'); setSelectedMentee(null) }}
            className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            До підопічних
          </button>

          {/* Шапка підопічного */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 mb-5 flex-wrap">
            <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xl flex-shrink-0">
              {selectedMentee.fullName[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-slate-900">{selectedMentee.fullName}</h1>
              <p className="text-sm text-slate-500">{selectedMentee.email}</p>
              <p className="text-xs text-slate-400 mt-0.5">Проєкт: {project.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center text-sm">
              <div className="bg-green-50 rounded-xl px-4 py-2">
                <p className="text-green-600 text-xs">Виконано</p>
                <p className="font-bold text-green-700 text-lg">{selectedMentee.completedTasks}</p>
              </div>
              <div className="bg-amber-50 rounded-xl px-4 py-2">
                <p className="text-amber-600 text-xs">Балів</p>
                <p className="font-bold text-amber-700 text-lg">{selectedMentee.totalPoints}</p>
              </div>
            </div>
          </div>

          {/* Вкладки */}
          <div className="flex gap-1 border-b border-slate-200 mb-5">
            <button
              onClick={() => setMenteeTab('tasks')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors inline-flex items-center gap-1.5 ${
                menteeTab === 'tasks'
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <ListChecks className="w-4 h-4" />
              Задачі ({selectedMentee.totalTasks})
            </button>
            <button
              onClick={() => setMenteeTab('notes')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors inline-flex items-center gap-1.5 ${
                menteeTab === 'notes'
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              Нотатки ({notes.length})
            </button>
          </div>

          {/* Задачі */}
          {menteeTab === 'tasks' && (
            <>
              {tasksLoading ? (
                <div className="text-sm text-slate-500 p-4 text-center">Завантаження задач…</div>
              ) : menteeTasks.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                  <ListChecks className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500">Задач ще немає</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {menteeTasks.map((task) => {
                    const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Done'
                    return (
                      <button
                        key={task.id}
                        onClick={() => setDetailTask(task)}
                        className="w-full bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-primary-300 hover:shadow-sm transition-all group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex-shrink-0">{statusIcon(task.status)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-slate-900 group-hover:text-primary-700 break-words">
                                {task.title}
                              </p>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`text-xs px-2 py-0.5 rounded font-medium ${TASK_PRIORITY_BADGE[task.priority]}`}>
                                  {TASK_PRIORITY_LABEL[task.priority]}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded font-medium ${TASK_STATUS_BADGE[task.status]}`}>
                                  {TASK_STATUS_LABEL[task.status]}
                                </span>
                              </div>
                            </div>
                            {task.description && (
                              <p className="text-xs text-slate-500 mt-1 line-clamp-1">{task.description}</p>
                            )}
                            {task.dueDate && (
                              <p className={`text-xs mt-1 ${overdue ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
                                Дедлайн: {new Date(task.dueDate).toLocaleDateString('uk-UA')}
                                {overdue && ' · Прострочено'}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* Нотатки */}
          {menteeTab === 'notes' && (
            <>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 text-xs text-slate-500">
                Нотатки видно тільки вам — це ваші приватні записи як ментора
              </div>

              <form onSubmit={handleAddNote} className="bg-white rounded-2xl border border-slate-200 p-5 mb-5">
                <label className="block text-sm font-medium text-slate-700 mb-2">Нова нотатка</label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Запишіть спостереження, плани або поради…"
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm mb-3 resize-none"
                />
                <button
                  type="submit"
                  disabled={!noteText.trim()}
                  className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Додати нотатку
                </button>
              </form>

              {notes.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                  <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500">Нотаток поки немає</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div key={note.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                      {editingNoteId === note.id ? (
                        <div>
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm mb-2 resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateNote(note.id)}
                              className="inline-flex items-center gap-1 bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
                            >
                              <Save className="w-3.5 h-3.5" />
                              Зберегти
                            </button>
                            <button
                              onClick={cancelEditNote}
                              className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium"
                            >
                              <X className="w-3.5 h-3.5" />
                              Скасувати
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-slate-800 whitespace-pre-wrap mb-2">{note.content}</p>
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>
                              {formatRelativeTime(note.createdAt)}
                              {note.updatedAt && note.updatedAt !== note.createdAt && (
                                <span className="italic"> · редаговано</span>
                              )}
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEditNote(note)}
                                className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Редагувати
                              </button>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-medium"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Видалити
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      <TaskDetailsModal
        open={detailTask !== null}
        task={detailTask}
        onClose={() => setDetailTask(null)}
        onChanged={() => selectedMentee && loadMenteeTasks(selectedMentee)}
      />
      <ConfirmDialog {...confirmProps} />
    </div>
  )
}