import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar, AlertCircle } from 'lucide-react'
import api from '../../api/client'
import type { TaskItem, TaskStatus } from '../../types'
import { TASK_STATUS_BADGE, TASK_STATUS_LABEL } from '../../constants/task'
import TaskDetailsModal from '../../components/tasks/TaskDetailsModal'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']

const MONTH_UA = [
  'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
  'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень',
]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

export default function CalendarPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [detailTask, setDetailTask] = useState<TaskItem | null>(null)

  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      const res = await api.get<TaskItem[]>('/tasks')
      setTasks(res.data)
    } catch {
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  const goToday = () => {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
  }

  // Задачі з дедлайном у поточному місяці, згруповані по дню
  const tasksByDay: Record<number, TaskItem[]> = {}
  tasks.forEach((task) => {
    if (!task.dueDate) return
    const d = new Date(task.dueDate)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      if (!tasksByDay[day]) tasksByDay[day] = []
      tasksByDay[day].push(task)
    }
  })

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  // Комірки сітки: порожні перед першим днем + дні місяця
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Доповнюємо до повного тижня
  while (cells.length % 7 !== 0) cells.push(null)

  const statusColor: Partial<Record<TaskStatus, string>> = {
    ToDo: 'bg-slate-100 text-slate-700',
    InProgress: 'bg-blue-100 text-blue-700',
    InReview: 'bg-purple-100 text-purple-700',
    NeedsRevision: 'bg-amber-100 text-amber-700',
    Done: 'bg-green-100 text-green-700',
  }

  const monthTasks = Object.values(tasksByDay).flat()
  const overdueCount = monthTasks.filter(
    (t) => new Date(t.dueDate!) < today && t.status !== 'Done'
  ).length
  const doneCount = monthTasks.filter((t) => t.status === 'Done').length

  return (
    <div className="max-w-6xl mx-auto p-6">

      {/* Шапка */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Календар задач</h1>
            <p className="text-sm text-slate-500">Задачі по дедлайну</p>
          </div>
        </div>

        {/* Навігація місяцем */}
        <div className="flex items-center gap-2">
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              {overdueCount} прострочено
            </span>
          )}
          {doneCount > 0 && (
            <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-lg font-medium">
              {doneCount} виконано
            </span>
          )}
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-sm font-medium bg-white border border-slate-200 rounded-lg hover:border-primary-300 text-slate-600"
          >
            Сьогодні
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:border-primary-300 text-slate-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-sm font-semibold text-slate-900 min-w-[140px] text-center">
              {MONTH_UA[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:border-primary-300 text-slate-600"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500">Завантаження...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* Дні тижня */}
          <div className="grid grid-cols-7 border-b border-slate-200">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500">
                {d}
              </div>
            ))}
          </div>

          {/* Сітка днів */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
            {cells.map((day, idx) => {
              const isToday =
                day !== null &&
                day === today.getDate() &&
                month === today.getMonth() &&
                year === today.getFullYear()

              const isPast =
                day !== null &&
                new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate())

              const dayTasks = day !== null ? (tasksByDay[day] ?? []) : []
              const hasOverdue = dayTasks.some(
                (t) => t.status !== 'Done' && new Date(t.dueDate!) < today
              )

              return (
                <div
                  key={idx}
                  className={`min-h-[100px] p-1.5 ${day === null ? 'bg-slate-50' : ''}`}
                >
                  {day !== null && (
                    <>
                      {/* Номер дня */}
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold ${
                            isToday
                              ? 'bg-primary-600 text-white'
                              : isPast
                              ? 'text-slate-400'
                              : 'text-slate-700'
                          }`}
                        >
                          {day}
                        </span>
                        {hasOverdue && (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="Є прострочені" />
                        )}
                      </div>

                      {/* Задачі */}
                      <div className="space-y-0.5">
                        {dayTasks.slice(0, 3).map((task) => (
                          <button
                            key={task.id}
                            onClick={() => setDetailTask(task)}
                            className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate font-medium hover:opacity-80 transition ${
                              task.status !== 'Done' && new Date(task.dueDate!) < today
                                ? 'bg-red-100 text-red-700'
                                : statusColor[task.status] ?? 'bg-slate-100 text-slate-700'
                            }`}
                            title={`${task.title} — ${TASK_STATUS_LABEL[task.status]}`}
                          >
                            {task.title}
                          </button>
                        ))}
                        {dayTasks.length > 3 && (
                          <p className="text-xs text-slate-400 pl-1">
                            +{dayTasks.length - 3} ще
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Легенда */}
      <div className="mt-4 flex items-center gap-4 flex-wrap text-xs text-slate-500">
        <span className="font-medium text-slate-600">Статуси:</span>
        {(['ToDo', 'InProgress', 'InReview', 'Done'] as TaskStatus[]).map((s) => (
          <span key={s} className={`px-2 py-0.5 rounded font-medium ${TASK_STATUS_BADGE[s]}`}>
            {TASK_STATUS_LABEL[s]}
          </span>
        ))}
        <span className="px-2 py-0.5 rounded font-medium bg-red-100 text-red-700">
          Прострочено
        </span>
      </div>

      <TaskDetailsModal
        open={detailTask !== null}
        task={detailTask}
        onClose={() => setDetailTask(null)}
        onChanged={loadTasks}
      />
    </div>
  )
}
