import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import api from '../../api/client'

interface Overview {
  totalProjects: number
  totalTeams: number
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
  Done: '#10b981',
}

const STATUS_LABELS: Record<string, string> = {
  ToDo: 'До виконання',
  InProgress: 'В роботі',
  Done: 'Виконано',
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
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [ovRes, projRes, actRes, perfRes] = await Promise.all([
        api.get<Overview>('/analytics/overview'),
        api.get<ProjectStats[]>('/analytics/projects-stats'),
        api.get<ActivityPoint[]>('/analytics/activity'),
        api.get<Performer[]>('/analytics/top-performers'),
      ])
      setOverview(ovRes.data)
      setProjectsStats(projRes.data)
      setActivity(actRes.data)
      setPerformers(perfRes.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити аналітику')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-slate-500">Завантаження аналітики...</div>
  }

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
    name: p.title.length > 15 ? p.title.substring(0, 15) + '...' : p.title,
    'До виконання': p.todoTasks,
    'В роботі': p.inProgressTasks,
    'Виконано': p.completedTasks,
  }))

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Аналітика</h1>
        <p className="text-sm text-slate-500 mt-1">Огляд активності в системі</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Картки загальної статистики */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 uppercase mb-1">Проєкти</p>
          <p className="text-3xl font-bold text-primary-600">{overview.totalProjects}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 uppercase mb-1">Команди</p>
          <p className="text-3xl font-bold text-purple-600">{overview.totalTeams}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 uppercase mb-1">Задачі</p>
          <p className="text-3xl font-bold text-blue-600">{overview.totalTasks}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 uppercase mb-1">Користувачі</p>
          <p className="text-3xl font-bold text-green-600">{overview.totalUsers}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 uppercase mb-1">Коментарі</p>
          <p className="text-3xl font-bold text-amber-600">{overview.totalComments}</p>
        </div>
      </div>

      {/* Кругові діаграми */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Статуси */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Задачі за статусом</h2>
          {statusPieData.length === 0 ? (
            <p className="text-center text-slate-400 py-12">Немає даних</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={90}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Пріоритети */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Задачі за пріоритетом</h2>
          {priorityPieData.length === 0 ? (
            <p className="text-center text-slate-400 py-12">Немає даних</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={priorityPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={90}
                  dataKey="value"
                >
                  {priorityPieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Активність за 14 днів */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
        <h2 className="font-semibold text-slate-900 mb-4">Активність за останні 14 днів</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={activity}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="dateLabel" stroke="#64748b" />
            <YAxis stroke="#64748b" allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="tasks"
              stroke="#4f46e5"
              strokeWidth={2}
              name="Створено задач"
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="comments"
              stroke="#10b981"
              strokeWidth={2}
              name="Коментарів"
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Задачі по проєктах */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
        <h2 className="font-semibold text-slate-900 mb-4">Задачі по проєктах (Топ-10)</h2>
        {projectsBarData.length === 0 ? (
          <p className="text-center text-slate-400 py-12">Проєктів поки немає</p>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={projectsBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" angle={-15} textAnchor="end" height={80} />
              <YAxis stroke="#64748b" allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="До виконання" stackId="a" fill="#94a3b8" />
              <Bar dataKey="В роботі" stackId="a" fill="#3b82f6" />
              <Bar dataKey="Виконано" stackId="a" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Топ виконавці */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Топ виконавців</h2>
        {performers.length === 0 ? (
          <p className="text-center text-slate-400 py-12">Поки немає виконаних задач</p>
        ) : (
          <div className="space-y-3">
            {performers.map((performer, index) => {
              const maxTasks = performers[0]?.completedTasks || 1
              const percentage = (performer.completedTasks / maxTasks) * 100

              return (
                <div key={performer.userId} className="flex items-center gap-4">
                  <div className="w-8 text-center text-lg font-bold text-slate-400">
                    #{index + 1}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold flex-shrink-0">
                    {performer.fullName[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{performer.fullName}</p>
                    <div className="mt-1 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-primary-500 to-primary-600 h-full transition-all"
                        style={{ width: `${percentage}%` }}
                      ></div>
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
      </div>
    </div>
  )
}