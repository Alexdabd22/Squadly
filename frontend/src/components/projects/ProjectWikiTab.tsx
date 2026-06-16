import { useEffect, useState, type ReactElement } from 'react'
import { Plus, Pencil, Trash2, FileText } from 'lucide-react'
import api from '../../api/client'
import ConfirmDialog from '../common/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'

interface WikiPageListItem {
  id: string
  title: string
  order: number
}

interface WikiPage {
  id: string
  projectId: string
  title: string
  content: string
  order: number
  createdAt: string
  updatedAt?: string
}

interface Props {
  projectId: string
  isOrganizer: boolean
}

const EXAMPLE_CONTENT = `# Як користуватися Wiki

Це проста сторінка з інструкцією.

## Заголовки
Починайте рядок з # для великого заголовка, ## для меншого.

## Списки
- перший пункт
- другий пункт
- третій пункт

## Виділення важливого
Просто пишіть текст звичайними реченнями.
Натискайте Enter для нового рядка.

Лишайте порожній рядок між абзацами — так буде читабельніше.`

export default function ProjectWikiTab({ projectId, isOrganizer }: Props) {
  const [pages, setPages] = useState<WikiPageListItem[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [page, setPage] = useState<WikiPage | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ title: '', content: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newTitle, setNewTitle] = useState('')

  const { confirm, confirmProps } = useConfirm()

  useEffect(() => { loadList() }, [projectId])

  useEffect(() => {
    if (activeId) loadPage(activeId)
    else { setPage(null); setEditing(false) }
  }, [activeId])

  const loadList = async () => {
    setLoading(true)
    try {
      const res = await api.get<WikiPageListItem[]>(`/projects/${projectId}/wiki`)
      setPages(res.data)
      if (res.data.length > 0 && (!activeId || !res.data.some((p) => p.id === activeId))) {
        setActiveId(res.data[0].id)
      } else if (res.data.length === 0) {
        setActiveId(null)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити')
    } finally {
      setLoading(false)
    }
  }

  const loadPage = async (id: string) => {
    try {
      const res = await api.get<WikiPage>(`/projects/${projectId}/wiki/${id}`)
      setPage(res.data)
      setForm({ title: res.data.title, content: res.data.content })
      setEditing(false)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити сторінку')
    }
  }

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    try {
      const res = await api.post<WikiPage>(`/projects/${projectId}/wiki`, {
        title: newTitle.trim(),
        content: '',
      })
      setNewTitle('')
      await loadList()
      setActiveId(res.data.id)
      setEditing(true)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося створити')
    }
  }

  const handleSave = async () => {
    if (!page || !form.title.trim()) return
    try {
      const res = await api.put<WikiPage>(`/projects/${projectId}/wiki/${page.id}`, form)
      setPage(res.data)
      setPages((prev) => prev.map((p) => p.id === res.data.id ? { ...p, title: res.data.title } : p))
      setEditing(false)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося зберегти')
    }
  }

  const handleDelete = async () => {
    if (!page) return
    const ok = await confirm({
      title: 'Видалення сторінки',
      message: `Видалити «${page.title}»?`,
      confirmText: 'Видалити',
      confirmVariant: 'danger',
    })
    if (!ok) return
    try {
      await api.delete(`/projects/${projectId}/wiki/${page.id}`)
      setActiveId(null)
      await loadList()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося видалити')
    }
  }

  if (loading) return <div className="text-slate-500 text-sm p-4">Завантаження…</div>

  return (
    <div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-3 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
        {/* ── Бокове меню ── */}
        <aside className="bg-white rounded-2xl border border-slate-200 p-3 h-fit">
          <h3 className="text-xs font-semibold text-slate-500 uppercase px-2 mb-2">Розділи</h3>

          {pages.length === 0 ? (
            <p className="text-sm text-slate-400 px-2 py-4">Розділів ще немає</p>
          ) : (
            <ul className="space-y-1 mb-3">
              {pages.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => setActiveId(p.id)}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-sm flex items-center gap-2 transition ${
                      activeId === p.id
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{p.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {isOrganizer && (
            <div className="border-t border-slate-100 pt-2 flex gap-1">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="Новий розділ…"
                maxLength={200}
                className="flex-1 px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim()}
                className="bg-primary-600 hover:bg-primary-700 text-white px-2 rounded-lg disabled:opacity-50"
                title="Додати"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </aside>

        {/* ── Контент ── */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 min-h-[400px]">
          {!page ? (
            <div className="text-center text-slate-400 py-16">
              <FileText className="w-10 h-10 mx-auto mb-2 text-slate-200" />
              <p className="text-sm">
                {isOrganizer ? 'Створіть перший розділ зліва' : 'Розділів поки немає'}
              </p>
            </div>
          ) : editing ? (
            <div>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Назва розділу"
                maxLength={200}
                className="w-full text-2xl font-bold text-slate-900 border-0 border-b border-slate-200 focus:outline-none focus:border-primary-500 pb-2 mb-4"
              />

              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder={EXAMPLE_CONTENT}
                rows={18}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y leading-relaxed"
              />

              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
                <p className="font-semibold mb-1">Як форматувати текст</p>
                <ul className="space-y-0.5 text-blue-800">
                  <li>• Рядок з <code className="bg-white px-1 rounded">#</code> на початку — великий заголовок</li>
                  <li>• Рядок з <code className="bg-white px-1 rounded">##</code> — менший заголовок</li>
                  <li>• Рядок з <code className="bg-white px-1 rounded">-</code> на початку — пункт списку</li>
                  <li>• Просто пишіть текст. Порожній рядок розділяє абзаци</li>
                </ul>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleSave}
                  disabled={!form.title.trim()}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  Зберегти
                </button>
                <button
                  onClick={() => { setEditing(false); setForm({ title: page.title, content: page.content }) }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Скасувати
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                <h2 className="text-2xl font-bold text-slate-900 break-words flex-1">{page.title}</h2>
                {isOrganizer && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => setEditing(true)}
                      className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                      title="Редагувати"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleDelete}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      title="Видалити"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {page.content.trim() === '' ? (
                <p className="text-slate-400 italic text-sm">Розділ ще порожній</p>
              ) : (
                <FormattedContent text={page.content} />
              )}
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog {...confirmProps} />
    </div>
  )
}

function FormattedContent({ text }: { text: string }) {
  const lines = text.split('\n')
  const out: ReactElement[] = []
  let listBuffer: string[] = []
  let paragraphBuffer: string[] = []

  const flushList = () => {
    if (listBuffer.length === 0) return
    out.push(
      <ul key={`ul-${out.length}`} className="list-disc pl-5 my-2 space-y-1 text-slate-800">
        {listBuffer.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    )
    listBuffer = []
  }
  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return
    out.push(
      <p key={`p-${out.length}`} className="text-slate-800 my-2 leading-relaxed whitespace-pre-line">
        {paragraphBuffer.join('\n')}
      </p>
    )
    paragraphBuffer = []
  }
  const flushAll = () => { flushList(); flushParagraph() }

  for (const raw of lines) {
    const line = raw.trim()
    if (line.startsWith('## ')) {
      flushAll()
      out.push(<h3 key={`h3-${out.length}`} className="text-lg font-semibold text-slate-900 mt-5 mb-2">{line.slice(3)}</h3>)
    } else if (line.startsWith('# ')) {
      flushAll()
      out.push(<h2 key={`h2-${out.length}`} className="text-xl font-bold text-slate-900 mt-6 mb-2">{line.slice(2)}</h2>)
    } else if (line.startsWith('- ')) {
      flushParagraph()
      listBuffer.push(line.slice(2))
    } else if (line === '') {
      flushAll()
    } else {
      flushList()
      paragraphBuffer.push(raw)
    }
  }
  flushAll()

  return <div className="text-sm">{out}</div>
}