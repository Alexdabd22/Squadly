import { useEffect, useState, FormEvent } from 'react'
import { GraduationCap, Users, FileText, Pencil, Trash2, ArrowLeft, Plus, Save, X } from 'lucide-react'
import api from '../../api/client'
import type { MentorProject, Mentee, MentorNote } from '../../types'
import { formatRelativeTime } from '../../utils/date'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'

type View = 'projects' | 'mentees' | 'notes'

export default function MentorPage() {
  const [view, setView] = useState<View>('projects')
  const [projects, setProjects] = useState<MentorProject[]>([])
  const [mentees, setMentees] = useState<Mentee[]>([])
  const [notes, setNotes] = useState<MentorNote[]>([])

  const [selectedProject, setSelectedProject] = useState<MentorProject | null>(null)
  const [selectedMentee, setSelectedMentee] = useState<Mentee | null>(null)

  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')

  const [noteText, setNoteText] = useState<string>('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState<string>('')

  const { confirm, confirmProps } = useConfirm()

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get<MentorProject[]>('/mentor/projects')
      setProjects(response.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити проєкти')
    } finally {
      setLoading(false)
    }
  }

  const loadMentees = async (project: MentorProject) => {
    setLoading(true)
    setError('')
    setSelectedProject(project)
    try {
      const response = await api.get<Mentee[]>(`/mentor/projects/${project.projectId}/mentees`)
      setMentees(response.data)
      setView('mentees')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити підопічних')
    } finally {
      setLoading(false)
    }
  }

  const loadNotes = async (mentee: Mentee) => {
    if (!selectedProject) return
    setLoading(true)
    setError('')
    setSelectedMentee(mentee)
    try {
      const response = await api.get<MentorNote[]>(`/mentor/notes/${mentee.userId}/${selectedProject.projectId}`)
      setNotes(response.data)
      setView('notes')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити нотатки')
    } finally {
      setLoading(false)
    }
  }

  const handleAddNote = async (e: FormEvent) => {
    e.preventDefault()
    if (!noteText.trim() || !selectedProject || !selectedMentee) return

    try {
      const response = await api.post<MentorNote>('/mentor/notes', {
        aboutUserId: selectedMentee.userId,
        projectId: selectedProject.projectId,
        content: noteText.trim()
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
      const response = await api.put<MentorNote>(`/mentor/notes/${noteId}`, {
        content: editingText.trim()
      })
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
      message: 'Ви впевнені, що хочете видалити цю нотатку?',
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

  const goBackToProjects = () => {
    setView('projects')
    setSelectedProject(null)
    setSelectedMentee(null)
    setMentees([])
  }

  const goBackToMentees = () => {
    setView('mentees')
    setSelectedMentee(null)
    setNotes([])
  }

  if (loading && projects.length === 0) {
    return <div className="p-6 text-slate-500">Завантаження...</div>
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
        <button
          onClick={goBackToProjects}
          className={`hover:text-primary-600 ${view === 'projects' ? 'text-primary-600 font-medium' : ''}`}
        >
          Менторство
        </button>
        {selectedProject && (
          <>
            <span>/</span>
            <button
              onClick={goBackToMentees}
              className={`hover:text-primary-600 ${view === 'mentees' ? 'text-primary-600 font-medium' : ''} truncate max-w-[200px]`}
            >
              {selectedProject.title}
            </button>
          </>
        )}
        {selectedMentee && (
          <>
            <span>/</span>
            <span className="text-primary-600 font-medium truncate max-w-[200px]">
              {selectedMentee.fullName}
            </span>
          </>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* ===== VIEW: PROJECTS ===== */}
      {view === 'projects' && (
        <>
          <div className="flex items-center gap-3 mb-6">
            <GraduationCap className="w-7 h-7 text-primary-600" />
            <h1 className="text-2xl font-bold text-slate-900">Менторство</h1>
          </div>

          {projects.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Ви ще не є ментором у жодному проєкті</p>
              <p className="text-xs text-slate-400 mt-2">
                Організатор проєкту має призначити вас ментором
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {projects.map((project) => {
                const progress = project.totalTasks > 0
                  ? Math.round((project.completedTasks / project.totalTasks) * 100)
                  : 0

                return (
                  <button
                    key={project.projectId}
                    onClick={() => loadMentees(project)}
                    className="bg-white rounded-2xl border border-slate-200 p-5 text-left hover:border-primary-300 hover:shadow-md transition-all"
                  >
                    <h3 className="font-semibold text-slate-900 mb-1">{project.title}</h3>
                    {project.description && (
                      <p className="text-sm text-slate-600 line-clamp-2 mb-3">{project.description}</p>
                    )}

                    <div className="flex items-center gap-4 mb-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {project.totalMembers} учасників
                      </span>
                      <span>•</span>
                      <span>{project.totalTasks} задач</span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-primary-500 to-primary-600 h-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {project.completedTasks}/{project.totalTasks} виконано ({progress}%)
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      {view === 'mentees' && selectedProject && (
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <button
                onClick={goBackToProjects}
                className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
              >
                <ArrowLeft className="w-4 h-4" />
                До проєктів
              </button>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <Users className="w-6 h-6 text-primary-600" />
                Підопічні
              </h1>
              <p className="text-sm text-slate-500 mt-1">Проєкт: {selectedProject.title}</p>
            </div>
          </div>

          {mentees.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <p className="text-slate-500">Поки немає підопічних у цьому проєкті</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mentees.map((mentee) => {
                const progress = mentee.totalTasks > 0
                  ? Math.round((mentee.completedTasks / mentee.totalTasks) * 100)
                  : 0

                return (
                  <div
                    key={mentee.userId}
                    className="bg-white rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold flex-shrink-0">
                        {mentee.fullName[0]?.toUpperCase() || '?'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <p className="font-semibold text-slate-900">{mentee.fullName}</p>
                            <p className="text-xs text-slate-500">{mentee.email}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                            mentee.role === 'Organizer'
                              ? 'bg-amber-100 text-amber-700'
                              : mentee.role === 'Mentor'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {mentee.role === 'Organizer' ? 'Організатор' :
                             mentee.role === 'Mentor' ? 'Ментор' : 'Учасник'}
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-2 mb-3 text-center text-xs">
                          <div className="bg-slate-50 rounded p-2">
                            <p className="text-slate-500">Усього</p>
                            <p className="font-bold text-slate-900">{mentee.totalTasks}</p>
                          </div>
                          <div className="bg-green-50 rounded p-2">
                            <p className="text-green-700">Виконано</p>
                            <p className="font-bold text-green-700">{mentee.completedTasks}</p>
                          </div>
                          <div className="bg-blue-50 rounded p-2">
                            <p className="text-blue-700">В роботі</p>
                            <p className="font-bold text-blue-700">{mentee.inProgressTasks}</p>
                          </div>
                          <div className="bg-amber-50 rounded p-2">
                            <p className="text-amber-700">Балів</p>
                            <p className="font-bold text-amber-700">{mentee.totalPoints}</p>
                          </div>
                        </div>

                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-3">
                          <div
                            className="bg-gradient-to-r from-primary-500 to-primary-600 h-full"
                            style={{ width: `${progress}%` }}
                          />
                        </div>

                        <button
                          onClick={() => loadNotes(mentee)}
                          className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                          <FileText className="w-4 h-4" />
                          Нотатки про підопічного →
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

      {/* ===== VIEW: NOTES ===== */}
      {view === 'notes' && selectedMentee && selectedProject && (
        <>
          <div className="mb-6">
            <button
              onClick={goBackToMentees}
              className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              До підопічних
            </button>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <FileText className="w-6 h-6 text-primary-600" />
              Приватні нотатки
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Про <strong>{selectedMentee.fullName}</strong> у проєкті <strong>{selectedProject.title}</strong>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Нотатки видно тільки вам — це ваші особисті записи як ментора
            </p>
          </div>

          {/* Форма додавання нотатки */}
          <form onSubmit={handleAddNote} className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Нова нотатка</label>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Запишіть свої спостереження, плани або поради..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm mb-3"
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

          {/* Список нотаток */}
          {notes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Нотаток поки немає</p>
              <p className="text-xs text-slate-400 mt-1">Запишіть першу нотатку вище</p>
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
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm mb-2"
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

      <ConfirmDialog {...confirmProps} />
    </div>
  )
}