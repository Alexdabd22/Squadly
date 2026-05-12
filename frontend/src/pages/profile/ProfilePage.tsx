import { useState, useEffect, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import type { User, UserStats } from '../../types'
import trophyIcon from '../../assets/trophy.png'


export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [editing, setEditing] = useState<boolean>(false)
  const [form, setForm] = useState({ firstName: '', lastName: '' })
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  useEffect(() => {
    loadProfile()
    loadStats()
  }, [])

  const loadProfile = async () => {
    try {
      const response = await api.get<User>('/users/me')
      setUser(response.data)
      setForm({ firstName: response.data.firstName, lastName: response.data.lastName })
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити профіль')
    }
  }

  const loadStats = async () => {
    try {
      const response = await api.get<UserStats>('/ratings/me')
      setStats(response.data)
    } catch {
    }
  }

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      const response = await api.put<User>('/users/me', form)
      setUser(response.data)
      setEditing(false)
      setSuccess('Профіль оновлено')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося оновити')
    }
  }

  if (!user) return <div className="p-6">Завантаження...</div>

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Профіль</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-2 mb-4 text-sm">
          {success}
        </div>
      )}

      {/* Основна інформація */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
        {editing ? (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ім'я</label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Прізвище</label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700">
                Зберегти
              </button>
              <button type="button" onClick={() => setEditing(false)} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-200">
                Скасувати
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-2xl font-bold">
                {user.firstName[0]?.toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{user.fullName}</h2>
                <p className="text-sm text-slate-500">{user.email}</p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Ім'я:</span>
                <span className="font-medium text-slate-900">{user.firstName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Прізвище:</span>
                <span className="font-medium text-slate-900">{user.lastName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Email:</span>
                <span className="font-medium text-slate-900">{user.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">ID:</span>
                <span className="font-mono text-xs text-slate-700">{user.id}</span>
              </div>
            </div>

            <button
              onClick={() => setEditing(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700"
            >
              Редагувати профіль
            </button>
          </>
        )}
      </div>

      {/* Статистика рейтингу */}
      {stats && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
           <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <img src={trophyIcon} alt="" className="w-5 h-5" />
              Моя статистика
            </h2>
            <Link to="/leaderboard" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              Перейти до рейтингу →
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-4 text-center">
              <p className="text-xs text-primary-700 uppercase font-semibold mb-1">Балів</p>
              <p className="text-3xl font-bold text-primary-700">{stats.totalPoints}</p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-yellow-100 rounded-xl p-4 text-center">
              <p className="text-xs text-amber-700 uppercase font-semibold mb-1">Місце</p>
              <p className="text-3xl font-bold text-amber-700">
                {stats.rank > 0 ? `#${stats.rank}` : '—'}
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center">
              <p className="text-xs text-green-700 uppercase font-semibold mb-1">Задач</p>
              <p className="text-3xl font-bold text-green-700">{stats.tasksCompleted}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center">
              <p className="text-xs text-purple-700 uppercase font-semibold mb-1">Коментарів</p>
              <p className="text-3xl font-bold text-purple-700">{stats.commentsCount}</p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-sm font-semibold text-slate-700 mb-2">Розподіл задач за пріоритетом:</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-medium w-20 text-center">
                  Високий
                </span>
                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-red-500 h-full"
                    style={{
                      width: stats.tasksCompleted > 0
                        ? `${(stats.tasksCompletedHigh / stats.tasksCompleted) * 100}%`
                        : '0%'
                    }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-slate-700 w-8 text-right">
                  {stats.tasksCompletedHigh}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-medium w-20 text-center">
                  Середній
                </span>
                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-500 h-full"
                    style={{
                      width: stats.tasksCompleted > 0
                        ? `${(stats.tasksCompletedMedium / stats.tasksCompleted) * 100}%`
                        : '0%'
                    }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-slate-700 w-8 text-right">
                  {stats.tasksCompletedMedium}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium w-20 text-center">
                  Низький
                </span>
                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-slate-500 h-full"
                    style={{
                      width: stats.tasksCompleted > 0
                        ? `${(stats.tasksCompletedLow / stats.tasksCompleted) * 100}%`
                        : '0%'
                    }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-slate-700 w-8 text-right">
                  {stats.tasksCompletedLow}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}