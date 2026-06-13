import type { TaskStatus, TaskPriority } from '../types'

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  ToDo: 'До виконання',
  InProgress: 'В роботі',
  InReview: 'На перевірці',
  Done: 'Виконано',
  NeedsRevision: 'Доопрацювання',
}

export const TASK_STATUS_BADGE: Record<TaskStatus, string> = {
  ToDo: 'bg-slate-100 text-slate-700',
  InProgress: 'bg-blue-100 text-blue-700',
  InReview: 'bg-purple-100 text-purple-700',
  Done: 'bg-green-100 text-green-700',
  NeedsRevision: 'bg-amber-100 text-amber-700',
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

export const KANBAN_COLUMNS: TaskStatus[] = ['ToDo', 'InProgress', 'InReview', 'Done']

export const KANBAN_COLUMN_BG: Record<TaskStatus, string> = {
  ToDo: 'bg-slate-50',
  InProgress: 'bg-blue-50',
  InReview: 'bg-purple-50',
  Done: 'bg-green-50',
  NeedsRevision: 'bg-amber-50',
}

export const KANBAN_COLUMN_HEADER: Record<TaskStatus, string> = {
  ToDo: 'text-slate-700',
  InProgress: 'text-blue-700',
  InReview: 'text-purple-700',
  Done: 'text-green-700',
  NeedsRevision: 'text-amber-700',
}