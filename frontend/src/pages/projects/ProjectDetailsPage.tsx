import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  LayoutGrid,
  Users,
  MessageCircle,
  BarChart3,
  FileText,
  Pencil,
  Calendar,
  Target,
} from 'lucide-react'
import api from '../../api/client'
import type { Project } from '../../types'
import {
  CATEGORIES,
  PRIORITY_LABEL,
  PRIORITY_BADGE,
  colorByValue,
  daysUntil,
} from '../../constants/project'
import Chat from '../../components/common/Chat'
import ProjectMembersModal from '../../components/common/ProjectMembersModal'
import ProjectWizard from '../../components/projects/ProjectWizard'
import ProjectKanbanTab from '../../components/projects/ProjectKanbanTab'
import ProjectAnalyticsTab from '../../components/projects/ProjectAnalyticsTab'
import ProjectReportTab from '../../components/projects/ProjectReportTab'

type Tab = 'tasks' | 'members' | 'chat' | 'analytics' | 'report'

const TABS: { key: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { key: 'tasks', label: 'Задачі', icon: LayoutGrid },
  { key: 'members', label: 'Учасники', icon: Users },
  { key: 'chat', label: 'Чат', icon: MessageCircle },
  { key: 'analytics', label: 'Аналітика', icon: BarChart3 },
  { key: 'report', label: 'Звіт', icon: FileText },
]

export default function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('tasks')

  const [membersModalOpen, setMembersModalOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await api.get<Project>(`/projects/${id}`)
      setProject(res.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити проєкт')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  if (loading) {
    return <div className="max-w-6xl mx-auto p-6 text-slate-500">Завантаження…</div>
  }

  if (error || !project) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-4">
          {error || 'Проєкт не знайдено'}
        </div>
        <Link to="/projects" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
          ← До списку проєктів
        </Link>
      </div>
    )
  }

  const color = colorByValue(project.color)
  const category = CATEGORIES.find((c) => c.value === project.category) ?? CATEGORIES[CATEGORIES.length - 1]
  const CategoryIcon = category.icon
  const days = daysUntil(project.deadline)
  const isOrganizer = project.currentUserRole === 'Organizer'

  const handleEditSubmit = async (data: any) => {
    setEditLoading(true)
    setEditError('')
    try {
      await api.put(`/projects/${project.id}`, data)
      setEditOpen(false)
      await load()
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Не вдалося зберегти')
    } finally {
      setEditLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Шапка */}
      <button
        onClick={() => navigate('/projects')}
        className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-3"
      >
        <ArrowLeft className="w-4 h-4" />
        До списку проєктів
      </button>

      <div className="relative bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${color.bar}`} />

        <div className="p-5 pl-6">
          <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${color.bg} ${color.text}`}>
                  <CategoryIcon className="w-3 h-3" />
                  {category.label}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${PRIORITY_BADGE[project.priority]}`}>
                  {PRIORITY_LABEL[project.priority]}
                </span>
                {project.status === 'Archived' && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-500">Архів</span>
                )}
                {project.status === 'Completed' && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-green-100 text-green-700">Завершено</span>
                )}
              </div>

              <h1 className="text-2xl font-bold text-slate-900 mb-1">{project.title}</h1>
              {project.description && (
                <p className="text-sm text-slate-600 mb-3">{project.description}</p>
              )}

              {project.goal && (
                <div className="flex items-start gap-2 text-sm text-slate-700 mb-3">
                  <Target className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Мета: </span>
                    <span className="text-slate-600">{project.goal}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {project.memberCount} учасників
                </span>
                {project.startDate && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Старт: {new Date(project.startDate).toLocaleDateString('uk-UA')}
                  </span>
                )}
                {project.deadline && (
                  <span
                    className={`inline-flex items-center gap-1 ${
                      days !== null && days < 0 ? 'text-red-600 font-medium' :
                      days !== null && days <= 3 ? 'text-amber-700 font-medium' : ''
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Дедлайн: {new Date(project.deadline).toLocaleDateString('uk-UA')}
                    {days !== null && days >= 0 && ` (${days} дн.)`}
                    {days !== null && days < 0 && ` (прострочено)`}
                  </span>
                )}
                <span>Власник: {project.createdByUserName}</span>
              </div>

              {project.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {project.tags.map((t) => (
                    <span key={t} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {isOrganizer && (
              <button
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium flex-shrink-0"
              >
                <Pencil className="w-4 h-4" />
                Редагувати
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors inline-flex items-center gap-1.5 whitespace-nowrap ${
              tab === key
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'tasks' && (
        <ProjectKanbanTab projectId={project.id} canManage={isOrganizer} />
      )}

      {tab === 'members' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-sm text-slate-600 mb-3">
            Керування учасниками проєкту. {isOrganizer
              ? 'Як організатор, ви можете додавати, видаляти учасників і змінювати їхні ролі.'
              : 'Тільки організатор може керувати учасниками.'}
          </p>
          <button
            onClick={() => setMembersModalOpen(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Відкрити список учасників
          </button>
        </div>
      )}

      {tab === 'chat' && (
        <Chat scope="project" scopeId={project.id} title={project.title} />
      )}

      {tab === 'analytics' && <ProjectAnalyticsTab projectId={project.id} />}

      {tab === 'report' && (
        <ProjectReportTab projectId={project.id} projectTitle={project.title} />
      )}

      {/* Модалки */}
      {membersModalOpen && (
        <ProjectMembersModal
          projectId={project.id}
          projectTitle={project.title}
          onClose={() => {
            setMembersModalOpen(false)
            load() 
          }}
        />
      )}

      <ProjectWizard
        open={editOpen}
        mode="edit"
        initial={project}
        loading={editLoading}
        error={editError}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEditSubmit}
      />
    </div>
  )
}