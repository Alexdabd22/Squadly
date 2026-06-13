import type { ProjectCategory, ProjectColor, ProjectPriority, ProjectStatus } from '../types'
import type { LucideIcon } from 'lucide-react'
import {
  Code2,
  Palette,
  Megaphone,
  FlaskConical,
  GraduationCap,
  Briefcase,
  Folder,
} from 'lucide-react'

export const CATEGORIES: { value: ProjectCategory; label: string; icon: LucideIcon }[] = [
  { value: 'Development', label: 'Розробка',     icon: Code2 },
  { value: 'Design',      label: 'Дизайн',       icon: Palette },
  { value: 'Marketing',   label: 'Маркетинг',    icon: Megaphone },
  { value: 'Research',    label: 'Дослідження',  icon: FlaskConical },
  { value: 'Education',   label: 'Освіта',       icon: GraduationCap },
  { value: 'Business',    label: 'Бізнес',       icon: Briefcase },
  { value: 'Other',       label: 'Інше',         icon: Folder },
]

export const CATEGORY_LABEL: Record<ProjectCategory, string> = {
  Development: 'Розробка',
  Design: 'Дизайн',
  Marketing: 'Маркетинг',
  Research: 'Дослідження',
  Education: 'Освіта',
  Business: 'Бізнес',
  Other: 'Інше',
}

export const PRIORITY_LABEL: Record<ProjectPriority, string> = {
  Low: 'Низький',
  Medium: 'Середній',
  High: 'Високий',
}

export const PRIORITY_BADGE: Record<ProjectPriority, string> = {
  Low: 'bg-slate-100 text-slate-700',
  Medium: 'bg-amber-100 text-amber-700',
  High: 'bg-red-100 text-red-700',
}

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  Active: 'Активний',
  Completed: 'Завершений',
  Archived: 'Архів',
}
export const COLORS: {
  value: ProjectColor
  label: string
  bar: string
  bg: string
  text: string
  ring: string
}[] = [
  { value: 'indigo', label: 'Індиго',   bar: 'bg-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700', ring: 'ring-indigo-500' },
  { value: 'blue',   label: 'Синій',    bar: 'bg-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-700',   ring: 'ring-blue-500' },
  { value: 'teal',   label: 'Бірюзовий',bar: 'bg-teal-500',   bg: 'bg-teal-50',   text: 'text-teal-700',   ring: 'ring-teal-500' },
  { value: 'green',  label: 'Зелений',  bar: 'bg-green-500',  bg: 'bg-green-50',  text: 'text-green-700',  ring: 'ring-green-500' },
  { value: 'amber',  label: 'Бурштин',  bar: 'bg-amber-500',  bg: 'bg-amber-50',  text: 'text-amber-700',  ring: 'ring-amber-500' },
  { value: 'orange', label: 'Оранжевий',bar: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-500' },
  { value: 'red',    label: 'Червоний', bar: 'bg-red-500',    bg: 'bg-red-50',    text: 'text-red-700',    ring: 'ring-red-500' },
  { value: 'purple', label: 'Фіолетовий', bar: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-700', ring: 'ring-purple-500' },
]

export const colorByValue = (value: ProjectColor) =>
  COLORS.find((c) => c.value === value) ?? COLORS[0]

export function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null
  const target = new Date(dateStr)
  if (isNaN(target.getTime())) return null
  const now = new Date()
  const diff = target.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}