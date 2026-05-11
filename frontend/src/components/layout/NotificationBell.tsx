import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import api from '../../api/client'

export default function NotificationBell() {
  const [count, setCount] = useState<number>(0)
  const location = useLocation()

  const loadCount = async () => {
    try {
      const response = await api.get<{ count: number }>('/notifications/unread-count')
      setCount(response.data.count)
    } catch {
      setCount(0)
    }
  }

  useEffect(() => {
    loadCount()

    // Оновлення при зміні маршруту
    const handleNotificationsChange = () => loadCount()
    window.addEventListener('notificationsChanged', handleNotificationsChange)

    // Періодичне оновлення кожні 30 секунд
    const interval = setInterval(loadCount, 30000)

    return () => {
      window.removeEventListener('notificationsChanged', handleNotificationsChange)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    loadCount()
  }, [location.pathname])

  return (
    <Link
      to="/notifications"
      className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-slate-100 transition-colors"
      title="Сповіщення"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.8"
        stroke="currentColor"
        className="w-5 h-5 text-slate-700"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
        />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-xs font-semibold flex items-center justify-center">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}