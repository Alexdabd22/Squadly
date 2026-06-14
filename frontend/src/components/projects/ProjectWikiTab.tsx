import { useEffect, useState, type ReactNode } from 'react'
import { BookOpen, Pencil, Save, X, Info } from 'lucide-react'
import api from '../../api/client'

interface Props {
  projectId: string
  canEdit: boolean  
}
function renderWiki(content: string) {
  const lines = content.split('\n')
  const elements: ReactNode[] = []
  let key = 0

  for (const raw of lines) {
    const line = raw

    if (line.startsWith('# ')) {
      elements.push(
        <h2 key={key++} className="text-xl font-bold text-slate-900 mt-6 mb-2 pb-2 border-b border-slate-200 first:mt-0">
          {line.slice(2)}
        </h2>
      )
    } else if (line.startsWith('## ')) {
      elements.push(
        <h3 key={key++} className="text-base font-semibold text-slate-800 mt-4 mb-1.5">
          {line.slice(3)}
        </h3>
      )
    } else if (line.startsWith('### ')) {
      elements.push(
        <h4 key={key++} className="text-sm font-semibold text-slate-700 mt-3 mb-1">
          {line.slice(4)}
        </h4>
      )
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <li key={key++} className="text-sm text-slate-700 ml-4 list-disc leading-relaxed">
          {formatInline(line.slice(2))}
        </li>
      )
    } else if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={key++} className="border-l-4 border-primary-300 pl-4 py-1 my-2 bg-primary-50 rounded-r text-sm text-slate-700 italic">
          {line.slice(2)}
        </blockquote>
      )
    } else if (line.trim() === '') {
      elements.push(<div key={key++} className="h-2" />)
    } else if (line.startsWith('---')) {
      elements.push(<hr key={key++} className="border-slate-200 my-4" />)
    } else {
      elements.push(
        <p key={key++} className="text-sm text-slate-700 leading-relaxed">
          {formatInline(line)}
        </p>
      )
    }
  }

  return elements
}

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-slate-100 text-primary-700 px-1 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>
    }
    return part
  })
}

const PLACEHOLDER = `# Назва розділу

Введіть опис проєкту, правила роботи, корисні посилання тощо.

## Правила роботи
- Задачі беруться в роботу через Kanban-дошку
- Здача задачі — через кнопку «Здати»
- Питання — в чаті проєкту

## Корисні посилання
- [Назва посилання](https://example.com)

> Підказка: використовуй # для заголовків, ** для **жирного**, \`код\` для коду`

export default function ProjectWikiTab({ projectId, canEdit }: Props) {
  const [content, setContent] = useState<string>('')
  const [editContent, setEditContent] = useState<string>('')
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadWiki()
  }, [projectId])

  const loadWiki = async () => {
    setLoading(true)
    try {
      const res = await api.get<{ content: string }>(`/projects/${projectId}/wiki`)
      setContent(res.data.content)
    } catch {
      setContent('')
    } finally {
      setLoading(false)
    }
  }

  const startEdit = () => {
    setEditContent(content || PLACEHOLDER)
    setEditing(true)
    setError('')
  }

  const cancelEdit = () => {
    setEditing(false)
    setError('')
  }

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await api.put<{ content: string }>(`/projects/${projectId}/wiki`, {
        content: editContent,
      })
      setContent(res.data.content)
      setEditing(false)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося зберегти')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-sm text-slate-500 p-4">Завантаження Wiki...</div>
  }

  return (
    <div>
      {/* Шапка вкладки */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary-600" />
          <h2 className="text-base font-semibold text-slate-900">Wiki проєкту</h2>
          <span className="text-xs text-slate-400">— документація та довідник для команди</span>
        </div>
        {canEdit && !editing && (
          <button
            onClick={startEdit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white border border-slate-200 text-slate-600 rounded-lg hover:border-primary-400 hover:text-primary-700 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Редагувати
          </button>
        )}
        {editing && (
          <div className="flex items-center gap-2">
            <button
              onClick={cancelEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
            >
              <X className="w-3.5 h-3.5" />
              Скасувати
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Збереження...' : 'Зберегти'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Режим редагування */}
      {editing ? (
        <div className="space-y-3">
          {/* Підказка */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong># Заголовок</strong>, <strong>## Підзаголовок</strong>, <strong>- пункт списку</strong>,{' '}
              <strong>**жирний**</strong>, <strong>`код`</strong>, <strong>{'>'} цитата</strong>, <strong>---</strong> роздільник
            </span>
          </div>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={24}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-mono leading-relaxed resize-y bg-white"
            placeholder={PLACEHOLDER}
          />
        </div>
      ) : content ? (
        /* Режим перегляду */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 min-h-[300px]">
          <div className="prose-like">
            {renderWiki(content)}
          </div>
        </div>
      ) : (
        /* Порожня Wiki */
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center">
          <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-slate-600 mb-1">Wiki ще порожня</h3>
          <p className="text-sm text-slate-400 mb-4 max-w-sm mx-auto">
            Тут можна зберігати документацію, правила роботи, корисні посилання та будь-яку довідкову інформацію для команди
          </p>
          {canEdit && (
            <button
              onClick={startEdit}
              className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium"
            >
              <Pencil className="w-4 h-4" />
              Створити першу сторінку
            </button>
          )}
          {!canEdit && (
            <p className="text-xs text-slate-400">Організатор або ментор може додати документацію</p>
          )}
        </div>
      )}
    </div>
  )
}
