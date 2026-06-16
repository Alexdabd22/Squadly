import { useEffect, useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { BarChart3, Info, FolderOpen, ListChecks, Users, MessageSquare, Trophy } from 'lucide-react'
import api from '../../api/client'

interface Overview {
  totalProjects: number
  totalTasks: number
  totalUsers: number
  totalComments: number
  tasksByStatus: { status: string; count: number }[]
  tasksByPriority: { priority: string; count: number }[]
}

interface ProjectStats {
  projectId: string
  title: string
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  todoTasks: number
}

interface ActivityPoint {
  date: string
  dateLabel: string
  tasks: number
  comments: number
}

interface Performer {
  userId: string
  fullName: string
  completedTasks: number
}

const STATUS_COLORS: Record<string, string> = {
  ToDo: '#94a3b8',
  InProgress: '#3b82f6',
  InReview: '#a855f7',
  Done: '#10b981',
  NeedsRevision: '#f59e0b',
}

const STATUS_LABELS: Record<string, string> = {
  ToDo: 'До виконання',
  InProgress: 'В роботі',
  InReview: 'На перевірці',
  Done: 'Виконано',
  NeedsRevision: 'Доопрацювання',
}

const PRIORITY_COLORS: Record<string, string> = {
  Low: '#94a3b8',
  Medium: '#f59e0b',
  High: '#ef4444',
}

const PRIORITY_LABELS: Record<string, string> = {
  Low: 'Низький',
  Medium: 'Середній',
  High: 'Високий',
}

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [projectsStats, setProjectsStats] = useState<ProjectStats[]>([])
  const [activity, setActivity] = useState<ActivityPoint[]>([])
  const [performers, setPerformers] = useState<Performer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [ov, proj, act, perf] = await Promise.all([
        api.get<Overview>('/analytics/overview'),
        api.get<ProjectStats[]>('/analytics/projects-stats'),
        api.get<ActivityPoint[]>('/analytics/activity'),
        api.get<Performer[]>('/analytics/top-performers'),
      ])
      setOverview(ov.data)
      setProjectsStats(proj.data)
      setActivity(act.data)
      setPerformers(perf.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити аналітику')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-6 text-slate-500">Завантаження аналітики…</div>

  if (!overview) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
          {error || 'Немає даних'}
        </div>
      </div>
    )
  }

  const statusPieData = overview.tasksByStatus.map((s) => ({
    name: STATUS_LABELS[s.status] || s.status,
    value: s.count,
    color: STATUS_COLORS[s.status] || '#94a3b8',
  }))

  const priorityPieData = overview.tasksByPriority.map((p) => ({
    name: PRIORITY_LABELS[p.priority] || p.priority,
    value: p.count,
    color: PRIORITY_COLORS[p.priority] || '#94a3b8',
  }))

  const projectsBarData = projectsStats.map((p) => ({
    name: p.title.length > 15 ? p.title.substring(0, 15) + '…' : p.title,
    'До виконання': p.todoTasks,
    'В роботі': p.inProgressTasks,
    'Виконано': p.completedTasks,
  }))

  const completionRate = overview.totalTasks > 0
    ? Math.round(((overview.tasksByStatus.find((s) => s.status === 'Done')?.count ?? 0) / overview.totalTasks) * 100)
    : 0

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Загальна аналітика</h1>
            <p className="text-sm text-slate-500 mt-0.5">Зведена статистика по проєктах, де ви берете участь</p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          Дані оновлюються в реальному часі. Показані лише проєкти, в яких ви є учасником, ментором або організатором.
          Для аналітики окремого проєкту — перейдіть до проєкту → вкладка «Аналітика».
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <KpiCard icon={FolderOpen} label="Проєктів" value={overview.totalProjects} color="text-primary-700 bg-primary-50" />
        <KpiCard icon={ListChecks} label="Задач" value={overview.totalTasks} color="text-blue-700 bg-blue-50" />
        <KpiCard icon={Users} label="Користувачів" value={overview.totalUsers} color="text-green-700 bg-green-50" />
        <KpiCard icon={MessageSquare} label="Коментарів" value={overview.totalComments} color="text-purple-700 bg-purple-50" />
        <KpiCard icon={Trophy} label="Виконано" value={`${completionRate}%`} color="text-amber-700 bg-amber-50" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card title="Розподіл задач за статусом" subtitle="Скільки задач у кожному стані життєвого циклу">
          {statusPieData.length === 0 ? (
            <p className="text-center text-slate-400 py-12">Немає даних</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={statusPieData} cx="50%" cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={90} dataKey="value"
                >
                  {statusPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Задачі за пріоритетом" subtitle="Скільки задач кожного рівня важливості">
          {priorityPieData.length === 0 ? (
            <p className="text-center text-slate-400 py-12">Немає даних</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={priorityPieData} cx="50%" cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={90} dataKey="value"
                >
                  {priorityPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card
        title="Активність за останні 14 днів"
        subtitle="Створення нових задач та коментарів день за днем"
        className="mb-6"
      >
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={activity}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="dateLabel" stroke="#64748b" />
            <YAxis stroke="#64748b" allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="tasks" stroke="#4f46e5" strokeWidth={2} name="Створено задач" dot={{ r: 3 }} />
            <Line type="monotone" dataKey="comments" stroke="#10b981" strokeWidth={2} name="Коментарів" dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card
        title="Задачі по проєктах (топ-10)"
        subtitle="Стан задач у найактивніших проєктах"
        className="mb-6"
      >
        {projectsBarData.length === 0 ? (
          <p className="text-center text-slate-400 py-12">Проєктів поки немає</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={projectsBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" angle={-15} textAnchor="end" height={70} />
              <YAxis stroke="#64748b" allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="До виконання" stackId="a" fill="#94a3b8" />
              <Bar dataKey="В роботі" stackId="a" fill="#3b82f6" />
              <Bar dataKey="Виконано" stackId="a" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card title="Топ виконавців" subtitle="Користувачі з найбільшою кількістю прийнятих задач">
        {performers.length === 0 ? (
          <p className="text-center text-slate-400 py-8">Поки немає виконаних задач</p>
        ) : (
          <div className="space-y-3">
            {performers.map((performer, index) => {
              const max = performers[0]?.completedTasks || 1
              const pct = (performer.completedTasks / max) * 100
              return (
                <div key={performer.userId} className="flex items-center gap-4">
                  <div className="w-6 text-center text-sm font-bold text-slate-400">#{index + 1}</div>
                  <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold flex-shrink-0">
                    {performer.fullName[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate text-sm">{performer.fullName}</p>
                    <div className="mt-1 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-primary-500 to-primary-600 h-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary-600">{performer.completedTasks}</p>
                    <p className="text-xs text-slate-500">задач</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof BarChart3
  label: string
  value: number | string
  color: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg mb-2 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}

function Card({
  title,
  subtitle,
  children,
  className,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-5 ${className ?? ''}`}>
      <div className="mb-3">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}
