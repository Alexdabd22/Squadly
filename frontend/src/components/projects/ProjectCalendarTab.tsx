import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import api from '../../api/client'
import type { TaskItem } from '../../types'
import { TASK_STATUS_LABEL, TASK_STATUS_BADGE } from '../../constants/task'
import TaskDetailsModal from '../tasks/TaskDetailsModal'

interface Props {
  projectId: string
  userRole?: string
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']
const MONTHS = [
  'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
  'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень',
]

export default function ProjectCalendarTab({ projectId, userRole }: Props) {
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cursor, setCursor] = useState(() => new Date())
  const [detailTask, setDetailTask] = useState<TaskItem | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get<TaskItem[]>(`/tasks?projectId=${projectId}`)
      setTasks(res.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити задачі')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [projectId])

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const firstWeekday = (firstDay.getDay() + 6) % 7
  const daysInMonth = lastDay.getDate()
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`

  const tasksByDay = new Map<number, TaskItem[]>()
  for (const t of tasks) {
    if (!t.dueDate) continue
    const d = new Date(t.dueDate)
    if (d.getFullYear() !== year || d.getMonth() !== month) continue
    const day = d.getDate()
    if (!tasksByDay.has(day)) tasksByDay.set(day, [])
    tasksByDay.get(day)!.push(t)
  }

  const monthTasks = tasks.filter((t) => {
    if (!t.dueDate) return false
    const d = new Date(t.dueDate)
    return d.getFullYear() === year && d.getMonth() === month
  })
  const overdue = monthTasks.filter((t) => t.dueDate && new Date(t.dueDate) < today && t.status !== 'Done').length
  const done = monthTasks.filter((t) => t.status === 'Done').length

  const cells: ({ day: number } | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d })
  while (cells.length % 7 !== 0) cells.push(null)

  const prevMonth = () => setCursor(new Date(year, month - 1, 1))
  const nextMonth = () => setCursor(new Date(year, month + 1, 1))
  const goToday = () => setCursor(new Date())

  if (loading) return <div className="text-slate-500 text-sm p-4">Завантаження…</div>

  return (
    <div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-3 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-primary-600" />
          <div>
            <h3 className="font-semibold text-slate-900">{MONTHS[month]} {year}</h3>
            <p className="text-xs text-slate-500">
              Задач у цьому місяці: {monthTasks.length} ·{' '}
              <span className="text-green-600">{done} виконано</span>
              {overdue > 0 && <> · <span className="text-red-600">{overdue} прострочено</span></>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg" title="Попередній місяць">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={goToday} className="px-3 py-1.5 text-sm font-medium bg-slate-100 hover:bg-slate-200 rounded-lg">
            Сьогодні
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg" title="Наступний місяць">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {WEEKDAYS.map((w) => (
            <div key={w} className="px-2 py-2 text-xs font-semibold text-slate-600 text-center">{w}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            if (!cell) return <div key={i} className="min-h-[100px] border-r border-b border-slate-100 bg-slate-50/30" />

            const dayTasks = tasksByDay.get(cell.day) ?? []
            const key = `${year}-${month}-${cell.day}`
            const isToday = key === todayKey
            const isWeekend = i % 7 === 5 || i % 7 === 6

            return (
              <div key={i} className={`min-h-[100px] border-r border-b border-slate-100 p-1.5 ${isWeekend ? 'bg-slate-50/40' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium ${isToday ? 'inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-600 text-white' : 'text-slate-700'}`}>
                    {cell.day}
                  </span>
                  {dayTasks.length > 3 && (
                    <span className="text-[10px] text-slate-400">+{dayTasks.length - 3}</span>
                  )}
                </div>
                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map((task) => {
                    const isOverdue = task.status !== 'Done' && new Date(task.dueDate!) < today
                    return (
                      <button
                        key={task.id}
                        onClick={() => setDetailTask(task)}
                        className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate hover:opacity-80 transition ${
                          isOverdue ? 'bg-red-100 text-red-700' : TASK_STATUS_BADGE[task.status]
                        }`}
                        title={`${task.title} · ${TASK_STATUS_LABEL[task.status]}`}
                      >
                        {task.title}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-100" /> До виконання</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100" /> В роботі</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-100" /> На перевірці</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100" /> Виконано</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100" /> Прострочено</span>
      </div>

      <TaskDetailsModal
        open={detailTask !== null}
        task={detailTask}
        onClose={() => setDetailTask(null)}
        onChanged={load}
        userRole={userRole}
      />
    </div>
  )
}
