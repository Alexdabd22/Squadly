import { useEffect, useState } from 'react'
import api from '../../api/client'
import type { LeaderboardEntry } from '../../types'
import trophyIcon from '../../assets/trophy.png'
import goldMedal from '../../assets/icons/medal-gold.png'
import silverMedal from '../../assets/icons/medal-silver.png'
import bronzeMedal from '../../assets/icons/medal-bronze.png'

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')

  const currentUserId = localStorage.getItem('userId')

  useEffect(() => {
    loadLeaderboard()
  }, [])

  const loadLeaderboard = async () => {
    setLoading(true)
    try {
      const response = await api.get<LeaderboardEntry[]>('/ratings/leaderboard')
      setEntries(response.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити рейтинг')
    } finally {
      setLoading(false)
    }
  }

 const getMedalIcon = (rank: number) => {
  if (rank === 1) return <img src={goldMedal} alt="1 місце" className="w-8 h-8 inline-block" />
  if (rank === 2) return <img src={silverMedal} alt="2 місце" className="w-8 h-8 inline-block" />
  if (rank === 3) return <img src={bronzeMedal} alt="3 місце" className="w-8 h-8 inline-block" />
  return null
}

  const getRankClass = (rank: number): string => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-amber-200'
    if (rank === 2) return 'bg-gradient-to-r from-slate-50 to-slate-100 border-slate-300'
    if (rank === 3) return 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200'
    return 'bg-white border-slate-200'
  }

  if (loading) {
    return <div className="p-6 text-slate-500">Завантаження...</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
       <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
        <img src={trophyIcon} alt="Trophy" className="w-8 h-8" />
        Рейтинг лідерів
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Бали нараховуються за виконання задач та коментування
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Top 3 — особлива секція */}
      {entries.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* 2 місце */}
          <div className="order-1 bg-white rounded-2xl border border-slate-300 p-4 text-center shadow-sm">
            <div className="text-center mb-2">
            <img src={silverMedal} alt="2 місце" className="w-16 h-16 mx-auto" />
            </div>
            <p className="text-xs text-slate-500 uppercase mb-1">2 місце</p>
            <p className="font-semibold text-slate-900 truncate mb-2">{entries[1].fullName}</p>
            <p className="text-2xl font-bold text-slate-700">{entries[1].totalPoints}</p>
            <p className="text-xs text-slate-500">балів</p>
          </div>

          {/* 1 місце — більше */}
          <div className="order-2 bg-gradient-to-b from-yellow-50 to-amber-50 rounded-2xl border-2 border-amber-300 p-4 text-center shadow-md transform md:scale-110">
            <div className="text-center mb-2">
            <img src={goldMedal} alt="1 місце" className="w-20 h-20 mx-auto" />
            </div>
            <p className="text-xs text-amber-700 uppercase mb-1 font-semibold">Чемпіон</p>
            <p className="font-bold text-slate-900 truncate mb-2">{entries[0].fullName}</p>
            <p className="text-3xl font-bold text-amber-700">{entries[0].totalPoints}</p>
            <p className="text-xs text-slate-500">балів</p>
          </div>

          {/* 3 місце */}
          <div className="order-3 bg-white rounded-2xl border border-orange-200 p-4 text-center shadow-sm">
            <div className="text-center mb-2">
            <img src={bronzeMedal} alt="3 місце" className="w-16 h-16 mx-auto" />
            </div>
            <p className="text-xs text-slate-500 uppercase mb-1">3 місце</p>
            <p className="font-semibold text-slate-900 truncate mb-2">{entries[2].fullName}</p>
            <p className="text-2xl font-bold text-slate-700">{entries[2].totalPoints}</p>
            <p className="text-xs text-slate-500">балів</p>
          </div>
        </div>
      )}

      {/* Повний список */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
          <h2 className="font-semibold text-slate-900">Повний рейтинг</h2>
        </div>

        {entries.length === 0 ? (
          <div className="p-12 text-center">
            <img src={trophyIcon} alt="Trophy" className="w-16 h-16 mx-auto mb-3 opacity-50" />
            <p className="text-slate-500">Рейтинг поки порожній</p>
            <p className="text-sm text-slate-400 mt-1">Виконайте задачі, щоб з'явитись у рейтингу</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {entries.map((entry) => {
              const isMe = entry.userId === currentUserId
              const medal = getMedalIcon(entry.rank)

              return (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-4 px-5 py-3 ${
                    isMe ? 'bg-primary-50' : 'hover:bg-slate-50'
                  } ${getRankClass(entry.rank)}`}
                >
                  <div className="w-10 text-center">
                    {medal ? (
                      <span className="text-2xl">{medal}</span>
                    ) : (
                      <span className="text-lg font-bold text-slate-400">#{entry.rank}</span>
                    )}
                  </div>

                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold flex-shrink-0">
                    {entry.fullName[0]?.toUpperCase() || '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">
                      {entry.fullName}
                      {isMe && (
                        <span className="ml-2 text-xs bg-primary-600 text-white px-2 py-0.5 rounded-full">
                          ви
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      Виконано задач: {entry.tasksCompleted}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold text-primary-600">{entry.totalPoints}</p>
                    <p className="text-xs text-slate-500">балів</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Інфо про бали */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Як заробити бали?</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Виконати задачу з пріоритетом <strong>Високий</strong> — <strong>20 балів</strong></li>
          <li>• Виконати задачу з пріоритетом <strong>Середній</strong> — <strong>10 балів</strong></li>
          <li>• Виконати задачу з пріоритетом <strong>Низький</strong> — <strong>5 балів</strong></li>
          <li>• Додати коментар — <strong>1 бал</strong></li>
        </ul>
      </div>
    </div>
  )
}