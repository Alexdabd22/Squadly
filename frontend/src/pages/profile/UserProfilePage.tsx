import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Trophy, ListChecks, MessageSquare,
  FolderOpen, Shield, GraduationCap, User as UserIcon,
} from 'lucide-react'
import api from '../../api/client'

interface PublicUser {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  globalRole: string
  createdAt: string
  stats: {
    totalPoints: number
    rank: number
    tasksCompleted: number
    tasksInProgress: number
    commentsCount: number
    projectsCount: number
  }
}

const ROLE_LABEL: Record<string, string> = {
  Admin: 'Адміністратор',
  Organizer: 'Організатор',
  User: 'Користувач',
}

const ROLE_BADGE: Record<string, string> = {
  Admin: 'bg-red-100 text-red-700',
  Organizer: 'bg-primary-100 text-primary-700',
  User: 'bg-slate-100 text-slate-700',
}

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [user, setUser] = useState<PublicUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const myId = sessionStorage.getItem('userId')
  const isMe = id === myId

  useEffect(() => {
    if (isMe) {
      navigate('/profile', { replace: true })
      return
    }
    if (!id) return
    setLoading(true)
    api.get<PublicUser>(`/users/${id}`)
      .then((res) => setUser(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Не вдалося завантажити профіль'))
      .finally(() => setLoading(false))
  }, [id, isMe, navigate])

  if (loading) return <div className="max-w-3xl mx-auto p-6 text-slate-500">Завантаження…</div>

  if (error || !user) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-sm">
          {error || 'Користувача не знайдено'}
        </div>
        <Link to="/leaderboard" className="text-primary-600 text-sm font-medium">
          ← До рейтингу
        </Link>
      </div>
    )
  }

  const initial = user.firstName[0]?.toUpperCase() || '?'

  return (
    <div className="max-w-3xl mx-auto p-6">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-3"
      >
        <ArrowLeft className="w-4 h-4" />
        Назад
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 flex items-center gap-4 flex-wrap">
        <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-3xl font-bold flex-shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">{user.fullName}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{user.email}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium ${ROLE_BADGE[user.globalRole] ?? 'bg-slate-100 text-slate-700'}`}>
              {user.globalRole === 'Admin' && <Shield className="w-3 h-3" />}
              {user.globalRole === 'Organizer' && <GraduationCap className="w-3 h-3" />}
              {user.globalRole === 'User' && <UserIcon className="w-3 h-3" />}
              {ROLE_LABEL[user.globalRole] ?? user.globalRole}
            </span>
            <span className="text-xs text-slate-400">
              у системі з {new Date(user.createdAt).toLocaleDateString('uk-UA')}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <StatCard icon={Trophy} label="Балів" value={user.stats.totalPoints} color="text-amber-700 bg-amber-50" />
        <StatCard
          icon={Trophy}
          label="Місце в рейтингу"
          value={user.stats.rank > 0 ? `#${user.stats.rank}` : '—'}
          color="text-primary-700 bg-primary-50"
        />
        <StatCard icon={ListChecks} label="Виконано задач" value={user.stats.tasksCompleted} color="text-green-700 bg-green-50" />
        <StatCard icon={ListChecks} label="Задач у роботі" value={user.stats.tasksInProgress} color="text-blue-700 bg-blue-50" />
        <StatCard icon={MessageSquare} label="Коментарів" value={user.stats.commentsCount} color="text-purple-700 bg-purple-50" />
        <StatCard icon={FolderOpen} label="Проєктів" value={user.stats.projectsCount} color="text-slate-700 bg-slate-50" />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        Це публічний профіль користувача. Особисту інформацію може редагувати лише власник акаунту або адміністратор.
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Trophy
  label: string
  value: number | string
  color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg mb-2 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}
