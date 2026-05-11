import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import type { Notification } from '../../types'
import { formatRelativeTime } from '../../utils/date'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'

const typeIcons: Record<string, string> = {
  TaskAssigned: '📋',
  TaskCommented: '💬',
  TaskStatusChanged: '🔄',
}

const typeColors: Record<string, string> = {
  TaskAssigned: 'bg-blue-100 text-blue-700',
  TaskCommented: 'bg-purple-100 text-purple-700',
  TaskStatusChanged: 'bg-amber-100 text-amber-700',
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const { confirm, confirmProps } = useConfirm()

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const response = await api.get<Notification[]>('/notifications')
      setNotifications(response.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити сповіщення')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      )
      window.dispatchEvent(new Event('notificationsChanged'))
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося позначити як прочитане')
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all')
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      )
      window.dispatchEvent(new Event('notificationsChanged'))
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося позначити всі')
    }
  }

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Видалення сповіщення',
      message: 'Ви впевнені, що хочете видалити це сповіщення?',
      confirmText: 'Видалити',
      confirmVariant: 'danger',
    })
    if (!ok) return

    try {
      await api.delete(`/notifications/${id}`)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      window.dispatchEvent(new Event('notificationsChanged'))
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося видалити')
    }
  }

  const filtered = filter === 'unread'
    ? notifications.filter((n) => !n.isRead)
    : notifications

  const unreadCount = notifications.filter((n) => !n.isRead).length

  if (loading) {
    return <div className="p-6 text-slate-500">Завантаження...</div>
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Сповіщення</h1>
          <p className="text-sm text-slate-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} непрочитаних` : 'Всі сповіщення прочитані'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-sm bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            Прочитати всі
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Фільтри */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
            filter === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Всі ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
            filter === 'unread'
              ? 'bg-primary-600 text-white'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Непрочитані ({unreadCount})
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-5xl mb-3">🔔</div>
          <p className="text-slate-500">
            {filter === 'unread' ? 'Немає непрочитаних сповіщень' : 'Сповіщень поки немає'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((notification) => {
            const icon = typeIcons[notification.type] || '🔔'
            const colorClass = typeColors[notification.type] || 'bg-slate-100 text-slate-700'
            const isTask = notification.relatedType === 'Task'

            return (
              <div
                key={notification.id}
                className={`bg-white rounded-2xl border p-4 transition-colors ${
                  notification.isRead ? 'border-slate-200' : 'border-primary-200 bg-primary-50/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg ${colorClass}`}
                  >
                    {icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">
                        {notification.title}
                        {!notification.isRead && (
                          <span className="inline-block w-2 h-2 bg-primary-600 rounded-full ml-2"></span>
                        )}
                      </h3>
                      <span className="text-xs text-slate-500 flex-shrink-0">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </div>

                    <p className="text-sm text-slate-700 mb-2">{notification.message}</p>

                    <div className="flex items-center gap-3">
                      {isTask && (
                        <Link
                          to="/tasks"
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Перейти до задачі →
                        </Link>
                      )}
                      {!notification.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="text-xs text-slate-600 hover:text-slate-900 font-medium"
                        >
                          Позначити прочитаним
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification.id)}
                        className="text-xs text-red-600 hover:text-red-700 font-medium ml-auto"
                      >
                        Видалити
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog {...confirmProps} />
    </div>
  )
}