import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderOpen, CheckCircle2, Archive, Layers } from 'lucide-react'
import api from '../../api/client'
import type { Project, CreateProjectRequest } from '../../types'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'
import ProjectCard from '../../components/projects/ProjectCard'
import ProjectWizard from '../../components/projects/ProjectWizard'

type FilterStatus = 'All' | 'Active' | 'Completed' | 'Archived'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [error, setError] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('All')

  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardMode, setWizardMode] = useState<'create' | 'edit'>('create')
  const [wizardInitial, setWizardInitial] = useState<Project | null>(null)
  const [wizardLoading, setWizardLoading] = useState(false)
  const [wizardError, setWizardError] = useState('')

  const { confirm, confirmProps } = useConfirm()
  const navigate = useNavigate()
  const [globalRole, setGlobalRole] = useState(sessionStorage.getItem('globalRole') ?? 'User')
  const canCreateProjects = globalRole === 'Organizer' || globalRole === 'Admin'

  useEffect(() => {
    loadProjects()
    const handleAuthChange = () => setGlobalRole(sessionStorage.getItem('globalRole') ?? 'User')
    window.addEventListener('authChanged', handleAuthChange)
    return () => window.removeEventListener('authChanged', handleAuthChange)
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

  // Підрахунок статистики
  const total = projects.length
  const active = projects.filter((p) => p.status === 'Active').length
  const completed = projects.filter((p) => p.status === 'Completed').length
  const archived = projects.filter((p) => p.status === 'Archived').length

  // Фільтрація
  const filtered = filterStatus === 'All'
    ? projects
    : projects.filter((p) => p.status === filterStatus)

  const FILTERS: { key: FilterStatus; label: string; count: number }[] = [
    { key: 'All', label: 'Усі', count: total },
    { key: 'Active', label: 'Активні', count: active },
    { key: 'Completed', label: 'Завершені', count: completed },
    { key: 'Archived', label: 'Архів', count: archived },
  ]

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Шапка */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Мої проєкти</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Керування та моніторинг усіх проєктів, у яких ви берете участь
          </p>
        </div>
        {canCreateProjects && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm"
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

      {/* Статистика */}
      {total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Layers className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{total}</p>
              <p className="text-xs text-slate-500">Всього</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">{active}</p>
              <p className="text-xs text-slate-500">Активних</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{completed}</p>
              <p className="text-xs text-slate-500">Завершених</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Archive className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-600">{archived}</p>
              <p className="text-xs text-slate-500">В архіві</p>
            </div>
          </div>
        </div>
      )}

      {/* Фільтри */}
      {total > 0 && (
        <div className="flex gap-1 mb-5 flex-wrap">
          {FILTERS.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === key
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-primary-300'
              }`}
            >
              {label}
              <span className={`ml-1.5 text-xs font-normal ${filterStatus === key ? 'opacity-80' : 'text-slate-400'}`}>
                {count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Підказка для не-організаторів */}
      {!canCreateProjects && projects.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Layers className="w-4 h-4 text-amber-700" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-800">Немає доступних проєктів</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Створювати проєкти може лише організатор. Зверніться до адміністратора,
              щоб отримати роль «Organizer», або зачекайте поки вас запросять до проєкту.
            </p>
          </div>
        </div>
      )}

      {/* Список проєктів */}
      {total === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">Проєктів ще немає</h3>
          <p className="text-sm text-slate-500 mb-4 max-w-sm mx-auto">
            {canCreateProjects
              ? 'Натисніть «Створити проєкт», щоб розпочати роботу над першим проєктом'
              : 'Вас ще не запросили до жодного проєкту'}
          </p>
          {canCreateProjects && (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Створити перший проєкт
            </button>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500">Немає проєктів із таким фільтром</p>
          <button
            onClick={() => setFilterStatus('All')}
            className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Показати всі
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => {
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
          })}
        </div>
      )}

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
