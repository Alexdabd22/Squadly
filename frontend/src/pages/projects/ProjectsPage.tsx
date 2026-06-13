import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import api from '../../api/client'
import type { Project, CreateProjectRequest } from '../../types'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'
import ProjectCard from '../../components/projects/ProjectCard'
import ProjectWizard from '../../components/projects/ProjectWizard'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [error, setError] = useState<string>('')

  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardMode, setWizardMode] = useState<'create' | 'edit'>('create')
  const [wizardInitial, setWizardInitial] = useState<Project | null>(null)
  const [wizardLoading, setWizardLoading] = useState(false)
  const [wizardError, setWizardError] = useState('')

  const { confirm, confirmProps } = useConfirm()
  const navigate = useNavigate()
  const globalRole = sessionStorage.getItem('globalRole') ?? 'User'
  const canCreateProjects = globalRole === 'Organizer' || globalRole === 'Admin'

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

  const openCreate = () => {
    setWizardMode('create')
    setWizardInitial(null)
    setWizardError('')
    setWizardOpen(true)
  }

  const openEdit = (project: Project) => {
    setWizardMode('edit')
    setWizardInitial(project)
    setWizardError('')
    setWizardOpen(true)
  }

  const handleWizardSubmit = async (data: CreateProjectRequest) => {
    setWizardLoading(true)
    setWizardError('')
    try {
      if (wizardMode === 'create') {
        await api.post('/projects', data)
      } else if (wizardInitial) {
        await api.put(`/projects/${wizardInitial.id}`, data)
      }
      setWizardOpen(false)
      await loadProjects()
    } catch (err: any) {
      setWizardError(err.response?.data?.message || 'Не вдалося зберегти')
    } finally {
      setWizardLoading(false)
    }
  }

  const handleDelete = async (project: Project) => {
    const ok = await confirm({
      title: 'Видалення проєкту',
      message: `Видалити «${project.title}»? Цю дію не можна скасувати.`,
      confirmText: 'Видалити',
      confirmVariant: 'danger',
    })
    if (!ok) return

    try {
      await api.delete(`/projects/${project.id}`)
      await loadProjects()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося видалити')
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Проєкти</h1>
        {canCreateProjects && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Створити проєкт
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-sm">
          {error}
        </div>
      )}

      {!canCreateProjects && projects.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-sm text-amber-800">
          Створювати нові проєкти може лише організатор. Зверніться до адміністратора, щоб отримати роль «Organizer».
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        {projects.length === 0 ? (
          <p className="col-span-full text-center text-slate-500 py-12">
            Проєктів поки немає.
          </p>
        ) : (
          projects.map((project) => {
            const canManage = project.currentUserRole === 'Organizer'
            return (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={() => navigate(`/projects/${project.id}`)}
                onEdit={canManage ? () => openEdit(project) : undefined}
                onDelete={canManage ? () => handleDelete(project) : undefined}
              />
            )
          })
        )}
      </div>

      <ConfirmDialog {...confirmProps} />

      <ProjectWizard
        open={wizardOpen}
        mode={wizardMode}
        initial={wizardInitial}
        loading={wizardLoading}
        error={wizardError}
        onClose={() => setWizardOpen(false)}
        onSubmit={handleWizardSubmit}
      />
    </div>
  )
}