import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import * as signalR from '@microsoft/signalr'
import api from '../../api/client'

export default function NotificationBell() {
  const [count, setCount] = useState<number>(0)
  const location = useLocation()
  const connectionRef = useRef<signalR.HubConnection | null>(null)

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
    setupSignalR()

    const handleChange = () => loadCount()
    window.addEventListener('notificationsChanged', handleChange)

    return () => {
      window.removeEventListener('notificationsChanged', handleChange)
      teardownSignalR()
    }
  }, [])

  // Оновлення при переході на іншу сторінку
  useEffect(() => {
    loadCount()
  }, [location.pathname])

  const setupSignalR = async () => {
    const token = sessionStorage.getItem('token')
    if (!token) return

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${import.meta.env.VITE_API_URL || 'http://localhost:5176'}/hubs/notifications`, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build()

    connection.on('UnreadCountChanged', (newCount: number) => {
      setCount(newCount)
    })

    connection.on('GlobalRoleChanged', (newRole: string) => {
      sessionStorage.setItem('globalRole', newRole)
      window.dispatchEvent(new Event('authChanged'))
    })

    try {
      await connection.start()
      connectionRef.current = connection
    } catch (err) {
      console.warn('NotificationHub: не вдалося підключитись, fallback на REST')
      const interval = setInterval(loadCount, 60000)
      return () => clearInterval(interval)
    }
  }

  const teardownSignalR = async () => {
    if (connectionRef.current) {
      try { await connectionRef.current.stop() } catch { /* ignore */ }
      connectionRef.current = null
    }
  }

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
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-xs font-semibold flex items-center justify-center leading-none">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
