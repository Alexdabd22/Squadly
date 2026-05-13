import { useEffect, useState, useRef, FormEvent, KeyboardEvent } from 'react'
import * as signalR from '@microsoft/signalr'
import api from '../../api/client'
import type { ChatMessage } from '../../types'
import { formatRelativeTime } from '../../utils/date'
import ConfirmDialog from './ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'
import chatIcon from '../../assets/icons/chat.png'

interface ChatProps {
  scope: 'team' | 'project'
  scopeId: string
  title?: string
}

export default function Chat({ scope, scopeId, title }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [sending, setSending] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const connectionRef = useRef<signalR.HubConnection | null>(null)
  const currentUserId = localStorage.getItem('userId')

  const { confirm, confirmProps } = useConfirm()

  const endpoint = `/messages/${scope}/${scopeId}`

  useEffect(() => {
    loadMessages()
    setupSignalR()

    return () => {
      teardownSignalR()
    }
  }, [scopeId, scope])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const setupSignalR = async () => {
    const token = localStorage.getItem('token')

    const connection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5176/hubs/chat', {
        accessTokenFactory: () => token || '',
      })
      .withAutomaticReconnect()
      .build()

    // Обробка нових повідомлень
    connection.on('MessageReceived', (msg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
    })

    connection.on('MessageDeleted', (messageId: string) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
    })

    try {
      await connection.start()
      setConnectionStatus('connected')

      // Приєднатись до групи
      if (scope === 'team') {
        await connection.invoke('JoinTeam', scopeId)
      } else {
        await connection.invoke('JoinProject', scopeId)
      }

      connectionRef.current = connection
    } catch (err) {
      console.error('SignalR connection error:', err)
      setConnectionStatus('disconnected')
    }
  }

  const teardownSignalR = async () => {
    if (connectionRef.current) {
      try {
        if (scope === 'team') {
          await connectionRef.current.invoke('LeaveTeam', scopeId).catch(() => {})
        } else {
          await connectionRef.current.invoke('LeaveProject', scopeId).catch(() => {})
        }
        await connectionRef.current.stop()
      } catch (err) {
        // ignore
      }
      connectionRef.current = null
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = async () => {
    try {
      const response = await api.get<ChatMessage[]>(endpoint)
      setMessages(response.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити повідомлення')
    } finally {
      setLoading(false)
    }
  }

    const handleSend = async (e: FormEvent) => {
        e.preventDefault()
        if (!text.trim() || sending) return

        setSending(true)
        setError('')
        try {
            const response = await api.post<ChatMessage>(endpoint, { content: text.trim() })
            setMessages((prev) => {
            if (prev.some((m) => m.id === response.data.id)) return prev
            return [...prev, response.data]
            })
            setText('')
        } catch (err: any) {
            setError(err.response?.data?.message || 'Не вдалося надіслати повідомлення')
        } finally {
            setSending(false)
        }
    }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e as any)
    }
  }

  const handleDelete = async (messageId: string) => {
    const ok = await confirm({
        title: 'Видалення повідомлення',
        message: 'Ви впевнені, що хочете видалити це повідомлення?',
        confirmText: 'Видалити',
        confirmVariant: 'danger',
    })
    if (!ok) return

    try {
        await api.delete(`${endpoint}/${messageId}`)
        setMessages((prev) => prev.filter((m) => m.id !== messageId))
    } catch (err: any) {
        setError(err.response?.data?.message || 'Не вдалося видалити')
    }
}

  const statusBadge = () => {
    if (connectionStatus === 'connected') {
      return <span className="text-xs text-green-600 flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
        Online
      </span>
    }
    if (connectionStatus === 'connecting') {
      return <span className="text-xs text-amber-600">Підключення...</span>
    }
    return <span className="text-xs text-red-600">Offline</span>
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 flex flex-col h-[500px]">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">{title || 'Чат'}</h3>
          <p className="text-xs text-slate-500">{messages.length} повідомлень</p>
        </div>
        {statusBadge()}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center text-slate-500 text-sm py-8">Завантаження...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <img src={chatIcon} alt="" className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm text-slate-500">Повідомлень поки немає</p>
            <p className="text-xs text-slate-400 mt-1">Будьте першим, хто напише</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.authorUserId === currentUserId

            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold ${
                    isMine
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {msg.authorName[0]?.toUpperCase() || '?'}
                </div>

                <div className={`max-w-[70%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className="flex items-baseline gap-2 mb-1">
                    {!isMine && (
                      <span className="text-xs font-medium text-slate-700">{msg.authorName}</span>
                    )}
                    <span className="text-xs text-slate-400">
                      {formatRelativeTime(msg.createdAt)}
                    </span>
                  </div>

                  <div className="group relative">
                    <div
                      className={`px-3 py-2 rounded-2xl text-sm break-words ${
                        isMine
                          ? 'bg-primary-600 text-white rounded-tr-sm'
                          : 'bg-slate-100 text-slate-900 rounded-tl-sm'
                      }`}
                    >
                      {msg.content}
                    </div>

                    {isMine && (
                      <button
                        onClick={() => handleDelete(msg.id)}
                        className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity text-xs"
                        title="Видалити"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-red-700 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSend} className="border-t border-slate-200 p-3 flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Напишіть повідомлення... (Enter — надіслати, Shift+Enter — новий рядок)"
          rows={2}
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg resize-none text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed self-stretch"
        >
          {sending ? '...' : 'Надіслати'}
        </button>
      </form>

      <ConfirmDialog {...confirmProps} />
    </div>
  )
}