import { useEffect, useState } from 'react'
import api from '../../api/client'

interface ProjectAnalytics {
  totalTasks: number
  todo: number
  inProgress: number
  done: number
  overdueTasks: number
  members: number
  comments: number
  completionRate: number
  tasksByPriority: { priority: string; count: number }[]
  topAssignees: { userId: string | null; fullName: string; completedTasks: number }[]
}

const PRIORITY_LABEL: Record<string, string> = {
  Low: 'Низький',
  Medium: 'Середній',
  High: 'Високий',
}

export default function ProjectAnalyticsTab({ projectId }: { projectId: string }) {
  const [data, setData] = useState<ProjectAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get<ProjectAnalytics>(`/analytics/project/${projectId}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Не вдалося завантажити аналітику'))
      .finally(() => setLoading(false))
  }, [projectId])

  if (loading) return <div className="text-slate-500 text-sm p-4">Завантаження…</div>
  if (error)
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
        {error}
      </div>
    )
  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="Усього задач" value={data.totalTasks} color="text-primary-600" />
        <Card label="Виконано" value={data.done} color="text-green-600" />
        <Card label="В роботі" value={data.inProgress} color="text-blue-600" />
        <Card label="Прострочено" value={data.overdueTasks} color="text-red-600" />
        <Card label="До виконання" value={data.todo} color="text-slate-700" />
        <Card label="Учасників" value={data.members} color="text-amber-600" />
        <Card label="Коментарів" value={data.comments} color="text-purple-600" />
        <Card label="Прогрес" value={`${data.completionRate}%`} color="text-primary-600" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 mb-3">Прогрес виконання</h3>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-primary-500 to-primary-600 h-full transition-all"
            style={{ width: `${data.completionRate}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {data.done} з {data.totalTasks} задач виконано
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Задачі за пріоритетом</h3>
          {data.tasksByPriority.length === 0 ? (
            <p className="text-sm text-slate-400">Немає даних</p>
          ) : (
            <ul className="space-y-2">
              {data.tasksByPriority.map((p) => (
                <li key={p.priority} className="flex justify-between text-sm">
                  <span className="text-slate-700">{PRIORITY_LABEL[p.priority] ?? p.priority}</span>
                  <span className="font-semibold text-slate-900">{p.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Топ виконавців</h3>
          {data.topAssignees.length === 0 ? (
            <p className="text-sm text-slate-400">Поки немає завершених задач</p>
          ) : (
            <ul className="space-y-2">
              {data.topAssignees.map((a, i) => (
                <li key={a.userId ?? i} className="flex items-center gap-3">
                  <span className="w-6 text-center font-bold text-slate-400 text-sm">
                    #{i + 1}
                  </span>
                  <span className="flex-1 text-sm text-slate-900 truncate">{a.fullName}</span>
                  <span className="text-sm font-bold text-primary-600">
                    {a.completedTasks} задач
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function Card({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <p className="text-xs text-slate-500 uppercase mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}