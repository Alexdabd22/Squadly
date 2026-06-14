import { useState } from 'react'
import { ChevronDown, ChevronRight, ListChecks } from 'lucide-react'
import type { TaskItem, TaskStatus } from '../../types'
import {
  TASK_STATUS_LABEL, TASK_STATUS_BADGE,
  TASK_PRIORITY_LABEL, TASK_PRIORITY_BADGE,
} from '../../constants/task'
import TaskDetailsModal from '../tasks/TaskDetailsModal'

interface Props {
  tasks: TaskItem[]
  onChanged: () => void
}

const STATUS_ORDER: TaskStatus[] = ['ToDo', 'InProgress', 'NeedsRevision', 'InReview', 'Done']

export default function ProjectTaskListView({ tasks, onChanged }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [detailTask, setDetailTask] = useState<TaskItem | null>(null)

  const toggle = (status: string) =>
    setCollapsed((prev) => ({ ...prev, [status]: !prev[status] }))

  const grouped = STATUS_ORDER.reduce<Record<TaskStatus, TaskItem[]>>(
    (acc, s) => ({ ...acc, [s]: tasks.filter((t) => t.status === s) }),
    {} as Record<TaskStatus, TaskItem[]>
  )

  const statusColor: Record<TaskStatus, string> = {
    ToDo: 'bg-slate-100 text-slate-600 border-slate-200',
    InProgress: 'bg-blue-50 text-blue-700 border-blue-200',
    NeedsRevision: 'bg-amber-50 text-amber-700 border-amber-200',
    InReview: 'bg-purple-50 text-purple-700 border-purple-200',
    Done: 'bg-green-50 text-green-700 border-green-200',
  }

  const totalVisible = tasks.length

  if (totalVisible === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <ListChecks className="w-12 h-12 text-slate-200 mx-auto mb-3" />
        <p className="text-slate-500">Задач ще немає</p>
        <p className="text-xs text-slate-400 mt-1">Додайте першу задачу через кнопку Kanban-перегляду</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {STATUS_ORDER.map((status) => {
          const group = grouped[status]
          if (group.length === 0) return null
          const isCollapsed = collapsed[status]

          return (
            <div key={status} className={`rounded-2xl border ${statusColor[status]} overflow-hidden`}>
              {/* Заголовок групи */}
              <button
                onClick={() => toggle(status)}
                className="w-full flex items-center justify-between px-4 py-3 hover:opacity-80 transition"
              >
                <div className="flex items-center gap-2">
                  {isCollapsed
                    ? <ChevronRight className="w-4 h-4" />
                    : <ChevronDown className="w-4 h-4" />}
                  <span className="font-semibold text-sm">{TASK_STATUS_LABEL[status]}</span>
                  <span className="text-xs opacity-60 font-normal">({group.length})</span>
                </div>
              </button>

              {/* Задачі */}
              {!isCollapsed && (
                <div className="bg-white border-t border-inherit divide-y divide-slate-100">
                  {group.map((task) => {
                    const overdue =
                      task.dueDate &&
                      new Date(task.dueDate) < new Date() &&
                      task.status !== 'Done'

                    return (
                      <button
                        key={task.id}
                        onClick={() => setDetailTask(task)}
                        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 transition group"
                      >
                        {/* Пріоритет — кольоровий індикатор */}
                        <div
                          className={`w-1.5 h-8 rounded-full flex-shrink-0 ${
                            task.priority === 'High'
                              ? 'bg-red-400'
                              : task.priority === 'Medium'
                              ? 'bg-amber-400'
                              : 'bg-slate-300'
                          }`}
                        />

                        {/* Назва + опис */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 group-hover:text-primary-700 truncate">
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-xs text-slate-400 truncate mt-0.5">{task.description}</p>
                          )}
                        </div>

                        {/* Виконавець */}
                        <div className="hidden sm:block min-w-[120px] text-right">
                          <p className="text-xs text-slate-500 truncate">
                            {task.assignee?.fullName || <span className="text-slate-300">—</span>}
                          </p>
                        </div>

                        {/* Дедлайн */}
                        <div className="hidden md:block min-w-[90px] text-right">
                          {task.dueDate ? (
                            <p className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
                              {new Date(task.dueDate).toLocaleDateString('uk-UA')}
                            </p>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </div>

                        {/* Бейджі */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${TASK_PRIORITY_BADGE[task.priority]}`}>
                            {TASK_PRIORITY_LABEL[task.priority]}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${TASK_STATUS_BADGE[task.status]}`}>
                            {TASK_STATUS_LABEL[task.status]}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <TaskDetailsModal
        open={detailTask !== null}
        task={detailTask}
        onClose={() => setDetailTask(null)}
        onChanged={onChanged}
      />
    </>
  )
}
