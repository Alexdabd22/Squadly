import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import type { Project, Team, TaskItem, User } from '../../types'
import type { LeaderboardEntry } from '../../types'
import trophyIcon from '../../assets/trophy.png'
import goldMedal from '../../assets/icons/medal-gold.png'
import silverMedal from '../../assets/icons/medal-silver.png'
import bronzeMedal from '../../assets/icons/medal-bronze.png'
interface Stats {
  projects: number
  teams: number
  tasks: number
  tasksToDo: number
  tasksInProgress: number
  tasksDone: number
  myTasks: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    projects: 0,
    teams: 0,
    tasks: 0,
    tasksToDo: 0,
    tasksInProgress: 0,
    tasksDone: 0,
    myTasks: 0,
  })
  const [recentTasks, setRecentTasks] = useState<TaskItem[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [topUsers, setTopUsers] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const userId = sessionStorage.getItem('userId')

      const [projectsRes, teamsRes, tasksRes, userRes] = await Promise.all([
        api.get<Project[]>('/projects'),
        api.get<Team[]>('/teams'),
        api.get<TaskItem[]>('/tasks'),
        api.get<User>('/users/me'),
      ])
    try {
        const lbRes = await api.get<LeaderboardEntry[]>('/ratings/leaderboard')
        setTopUsers(lbRes.data.slice(0, 3))
        } catch {
        // ok if empty
    }      
      const tasks = tasksRes.data
      const tasksToDo = tasks.filter((t) => t.status === 'ToDo').length
      const tasksInProgress = tasks.filter((t) => t.status === 'InProgress').length
      const tasksDone = tasks.filter((t) => t.status === 'Done').length
      const myTasks = tasks.filter((t) => t.assignee?.id === userId).length

      setStats({
        projects: projectsRes.data.length,
        teams: teamsRes.data.length,
        tasks: tasks.length,
        tasksToDo,
        tasksInProgress,
        tasksDone,
        myTasks,
      })

      // Останні 5 задач, відсортованих за датою створення
      const sorted = [...tasks].sort((a, b) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      )
      setRecentTasks(sorted.slice(0, 5))

      setUser(userRes.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити дані')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-slate-500">Завантаження...</div>
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Вітаємо{user?.firstName ? `, ${user.firstName}` : ''}! 
        </h1>
        <p className="text-slate-600 mt-1">Огляд вашої активності у Squadly</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Основні картки */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Link
          to="/projects"
          className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
        >
          <p className="text-sm text-slate-500 mb-1">Проєкти</p>
          <p className="text-3xl font-bold text-primary-600">{stats.projects}</p>
        </Link>

        <Link
          to="/teams"
          className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
        >
          <p className="text-sm text-slate-500 mb-1">Команди</p>
          <p className="text-3xl font-bold text-primary-600">{stats.teams}</p>
        </Link>

        <Link
          to="/tasks"
          className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
        >
          <p className="text-sm text-slate-500 mb-1">Усього задач</p>
          <p className="text-3xl font-bold text-primary-600">{stats.tasks}</p>
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500 mb-1">Мої задачі</p>
          <p className="text-3xl font-bold text-amber-600">{stats.myTasks}</p>
        </div>
      </div>

      {/* Статуси задач */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-700">До виконання</p>
            <span className="inline-block w-3 h-3 rounded-full bg-slate-400"></span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.tasksToDo}</p>
        </div>

        <div className="bg-blue-50 rounded-2xl border border-blue-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-blue-700">В роботі</p>
            <span className="inline-block w-3 h-3 rounded-full bg-blue-500"></span>
          </div>
          <p className="text-2xl font-bold text-blue-900">{stats.tasksInProgress}</p>
        </div>

        <div className="bg-green-50 rounded-2xl border border-green-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-green-700">Виконано</p>
            <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>
          </div>
          <p className="text-2xl font-bold text-green-900">{stats.tasksDone}</p>
        </div>
      </div>

      {/* Прогрес */}
      {stats.tasks > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900">Прогрес виконання</h2>
            <span className="text-sm text-slate-500">
              {Math.round((stats.tasksDone / stats.tasks) * 100)}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary-500 to-primary-600 h-full transition-all"
              style={{ width: `${(stats.tasksDone / stats.tasks) * 100}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {stats.tasksDone} з {stats.tasks} задач виконано
          </p>
        </div>
      )}
        {/* Top 3 */}
    {topUsers.length > 0 && (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
       <h2 className="font-semibold text-slate-900 flex items-center gap-2">
        <img src={trophyIcon} alt="" className="w-5 h-5" />
        Топ-3 лідери
        </h2>
        <Link to="/leaderboard" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            Весь рейтинг →
        </Link>
        </div>
        <div className="space-y-2">
        {topUsers.map((entry) => (
            <div key={entry.userId} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50">
            <img
            src={entry.rank === 1 ? goldMedal : entry.rank === 2 ? silverMedal : bronzeMedal}
            alt={`${entry.rank} місце`}
            className="w-7 h-7"
            />
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-semibold">
                {entry.fullName[0]?.toUpperCase()}
            </div>
            <p className="flex-1 text-sm font-medium text-slate-900 truncate">{entry.fullName}</p>
            <p className="text-sm font-bold text-primary-600">{entry.totalPoints} балів</p>
            </div>
        ))}
        </div>
    </div>
    )}
      {/* Останні задачі */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">Останні задачі</h2>
          <Link to="/tasks" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            Всі задачі →
          </Link>
        </div>

        {recentTasks.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">Задач поки немає</p>
        ) : (
          <div className="space-y-2">
            {recentTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {task.project?.title || 'Без проєкту'}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-medium ${
                    task.status === 'Done'
                      ? 'bg-green-100 text-green-700'
                      : task.status === 'InProgress'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {task.status === 'Done' ? 'Виконано' : task.status === 'InProgress' ? 'В роботі' : 'До виконання'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}