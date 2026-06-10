import { useState, useEffect, FormEvent } from 'react'
import { Users, MessageCircle, Pencil, Trash2 } from 'lucide-react'
import api from '../../api/client'
import type { Project, CreateProjectRequest } from '../../types'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'
import Chat from '../../components/common/Chat'
import ProjectMembersModal from '../../components/common/ProjectMembersModal'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [form, setForm] = useState<CreateProjectRequest>({ title: '', description: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<CreateProjectRequest>({ title: '', description: '' })
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [membersModalProject, setMembersModalProject] = useState<Project | null>(null)

  const { confirm, confirmProps } = useConfirm()

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const response = await api.get<Project[]>('/projects')
      setProjects(response.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити проєкти')
    }
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/projects', form)
      setForm({ title: '', description: '' })
      loadProjects()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Помилка створення')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Видалення проєкту',
      message: 'Ви впевнені, що хочете видалити цей проєкт? Цю дію не можна скасувати.',
      confirmText: 'Видалити',
      confirmVariant: 'danger',
    })
    if (!ok) return

    try {
      await api.delete(`/projects/${id}`)
      if (selectedProjectId === id) setSelectedProjectId(null)
      loadProjects()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося видалити')
    }
  }

  const startEdit = (project: Project) => {
    setEditingId(project.id)
    setEditForm({ title: project.title, description: project.description || '' })
  }

  const handleUpdate = async (id: string) => {
    try {
      await api.put(`/projects/${id}`, editForm)
      setEditingId(null)
      loadProjects()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося оновити')
    }
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId)

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Проєкти</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-sm">
          {error}
        </div>
      )}

      <form
        onSubmit={handleCreate}
        className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6 space-y-3"
      >
        <h2 className="font-semibold text-slate-900">Створити проєкт</h2>
        <input
          type="text"
          placeholder="Назва проєкту"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          required
        />
        <textarea
          placeholder="Опис"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? 'Створення...' : 'Створити'}
        </button>
      </form>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        {projects.length === 0 && (
          <p className="col-span-full text-center text-slate-500 py-12">
            Проєктів поки немає. Створіть перший вище.
          </p>
        )}
        {projects.map((project) => (
          <div
            key={project.id}
            className={`bg-white rounded-2xl shadow-sm border p-5 transition-all ${
              selectedProjectId === project.id
                ? 'border-primary-500 ring-2 ring-primary-200'
                : 'border-slate-200'
            }`}
          >
            {editingId === project.id ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdate(project.id)}
                    className="flex-1 bg-primary-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-primary-700"
                  >
                    Зберегти
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="flex-1 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-200"
                  >
                    Скасувати
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="font-semibold text-slate-900 mb-1">{project.title}</h3>
                {project.description && (
                  <p className="text-sm text-slate-600 mb-3">{project.description}</p>
                )}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() =>
                      setSelectedProjectId(project.id === selectedProjectId ? null : project.id)
                    }
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {selectedProjectId === project.id ? 'Закрити чат' : 'Чат'}
                  </button>
                  <button
                    onClick={() => setMembersModalProject(project)}
                    className="text-sm text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-1"
                  >
                    <Users className="w-4 h-4" />
                    Учасники
                  </button>
                  <button
                    onClick={() => startEdit(project)}
                    className="text-sm text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-1"
                  >
                    <Pencil className="w-4 h-4" />
                    Редагувати
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="text-sm text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    Видалити
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {selectedProject && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary-600" />
            Чат проєкту «{selectedProject.title}»
          </h2>
          <Chat scope="project" scopeId={selectedProject.id} title={selectedProject.title} />
        </div>
      )}

      <ConfirmDialog {...confirmProps} />

      {membersModalProject && (
        <ProjectMembersModal
          projectId={membersModalProject.id}
          projectTitle={membersModalProject.title}
          onClose={() => setMembersModalProject(null)}
        />
      )}
    </div>
  )
}