import { useState, useRef, useEffect } from 'react'
import { Search, X, FolderOpen, CheckSquare, User as UserIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client'

interface SearchResults {
  projects: { id: string; title: string; description: string; type: string }[]
  tasks: { id: string; title: string; status: string; priority: string; projectId: string; projectTitle: string; type: string }[]
  users: { id: string; fullName: string; email: string; type: string }[]
}

const STATUS_LABELS: Record<string, string> = {
  ToDo: 'До виконання',
  InProgress: 'В роботі',
  Done: 'Виконано',
}

const STATUS_COLORS: Record<string, string> = {
  ToDo: 'bg-slate-100 text-slate-700',
  InProgress: 'bg-blue-100 text-blue-700',
  Done: 'bg-green-100 text-green-700',
}

export default function SearchBar() {
  const [query, setQuery] = useState<string>('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)

  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()

  // Закрити при кліку поза зоною пошуку
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = (value: string) => {
    setQuery(value)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.trim().length < 2) {
      setResults(null)
      setIsOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const response = await api.get<SearchResults>(`/search?q=${encodeURIComponent(value.trim())}`)
        setResults(response.data)
        setIsOpen(true)
      } catch {
        setResults(null)
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  const handleClear = () => {
    setQuery('')
    setResults(null)
    setIsOpen(false)
  }

  const handleNavigate = (path: string) => {
    handleClear()
    navigate(path)
  }

  const totalResults =
    (results?.projects?.length || 0) +
    (results?.tasks?.length || 0) +
    (results?.users?.length || 0)

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => results && setIsOpen(true)}
          placeholder="Пошук задач, проєктів, користувачів..."
          className="w-64 pl-9 pr-8 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-slate-50"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown з результатами */}
      {isOpen && results && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-96 overflow-y-auto z-50 w-96">
          {loading && (
            <div className="p-4 text-center text-sm text-slate-500">Пошук...</div>
          )}

          {!loading && totalResults === 0 && (
            <div className="p-4 text-center text-sm text-slate-500">
              Нічого не знайдено за запитом «{query}»
            </div>
          )}

          {/* Проєкти */}
          {results.projects.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                Проєкти
              </div>
              {results.projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleNavigate(`/projects/${p.id}`)}
                  className="w-full px-4 py-2 hover:bg-slate-50 flex items-center gap-3 text-left"
                >
                  <FolderOpen className="w-4 h-4 text-primary-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{p.title}</p>
                    {p.description && (
                      <p className="text-xs text-slate-500 truncate">{p.description}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Задачі */}
          {results.tasks.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                Задачі
              </div>
              {results.tasks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleNavigate(`/projects/${t.projectId}`)}
                  className="w-full px-4 py-2 hover:bg-slate-50 flex items-center gap-3 text-left"
                >
                  <CheckSquare className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{t.title}</p>
                    <p className="text-xs text-slate-500 truncate">{t.projectTitle}</p>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${STATUS_COLORS[t.status] || ''}`}>
                    {STATUS_LABELS[t.status] || t.status}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Користувачі */}
          {results.users.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                Користувачі
              </div>
              {results.users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleNavigate(`/users/${u.id}`)}
                  className="w-full px-4 py-2 hover:bg-slate-50 flex items-center gap-3 text-left"
                >
                  <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-semibold flex-shrink-0">
                    {u.fullName[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{u.fullName}</p>
                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}