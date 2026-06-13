import type { TaskStatus, TaskPriority } from '../types'

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  ToDo: 'До виконання',
  InProgress: 'В роботі',
  Done: 'Виконано',
}

export const TASK_STATUS_BADGE: Record<TaskStatus, string> = {
  ToDo: 'bg-slate-100 text-slate-700',
  InProgress: 'bg-blue-100 text-blue-700',
  Done: 'bg-green-100 text-green-700',
}

export const TASK_STATUS_COLUMN: Record<TaskStatus, string> = {
  ToDo: 'bg-slate-50 border-slate-200',
  InProgress: 'bg-blue-50 border-blue-200',
  Done: 'bg-green-50 border-green-200',
}

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  Low: 'Низький',
  Medium: 'Середній',
  High: 'Високий',
}

export const TASK_PRIORITY_BADGE: Record<TaskPriority, string> = {
  Low: 'bg-slate-100 text-slate-700',
  Medium: 'bg-amber-100 text-amber-700',
  High: 'bg-red-100 text-red-700',
}

export const TASK_STATUSES: TaskStatus[] = ['ToDo', 'InProgress', 'Done']