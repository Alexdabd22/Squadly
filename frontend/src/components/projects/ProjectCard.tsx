import type { Project } from '../../types'
import {
  CATEGORIES,
  PRIORITY_LABEL,
  PRIORITY_BADGE,
  colorByValue,
  daysUntil,
} from '../../constants/project'
import { Pencil, Trash2 } from 'lucide-react'

interface Props {
  project: Project
  selected?: boolean
  onOpen?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

export default function ProjectCard({
  project,
  selected = false,
  onOpen,
  onEdit,
  onDelete,
}: Props) {
  const color = colorByValue(project.color)
  const days = daysUntil(project.deadline)

  const isOverdue = days !== null && days < 0
  const isSoon = days !== null && days >= 0 && days <= 3

  const category =
    CATEGORIES.find((c) => c.value === project.category) ??
    CATEGORIES[CATEGORIES.length - 1]
  const CategoryIcon = category.icon

  const handleAction = (e: React.MouseEvent, fn?: () => void) => {
    e.stopPropagation()
    fn?.()
  }

  return (
    <div
      onClick={onOpen}
      className={`relative bg-white rounded-2xl border overflow-hidden transition-all cursor-pointer ${
        selected ? 'border-primary-500 ring-2 ring-primary-200' : 'border-slate-200 hover:shadow-md'
      }`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${color.bar}`} />

      <div className="p-5 pl-6">
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

        <h3 className="font-semibold text-slate-900 mb-1 truncate">{project.title}</h3>
        {project.description && (
          <p className="text-sm text-slate-600 mb-3 line-clamp-2">{project.description}</p>
        )}

        <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
          <span>
            {project.memberCount}{' '}
            {pluralize(project.memberCount, 'учасник', 'учасники', 'учасників')}
          </span>
          {days !== null && (
            <span
              className={
                isOverdue
                  ? 'text-red-600 font-medium'
                  : isSoon
                  ? 'text-amber-700 font-medium'
                  : ''
              }
            >
              {isOverdue
                ? `Прострочено на ${Math.abs(days)} ${pluralize(Math.abs(days), 'день', 'дні', 'днів')}`
                : days === 0
                ? 'Дедлайн сьогодні'
                : `${days} ${pluralize(days, 'день', 'дні', 'днів')} до дедлайну`}
            </span>
          )}
        </div>

        {project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {project.tags.slice(0, 5).map((t) => (
              <span key={t} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                #{t}
              </span>
            ))}
            {project.tags.length > 5 && (
              <span className="text-xs text-slate-400">+{project.tags.length - 5}</span>
            )}
          </div>
        )}

        {(onEdit || onDelete) && (
          <div className="flex gap-2 flex-wrap pt-2 border-t border-slate-100">
            {onEdit && (
              <button
                onClick={(e) => handleAction(e, onEdit)}
                className="text-sm text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-1"
              >
                <Pencil className="w-4 h-4" />
                Редагувати
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => handleAction(e, onDelete)}
                className="text-sm text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Видалити
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}