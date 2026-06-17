import { useEffect, useRef, useState } from 'react'
import * as signalR from '@microsoft/signalr'
import { MessageCircle, X, Send, Shield } from 'lucide-react'
import api from '../../api/client'
import { formatRelativeTime } from '../../utils/date'

interface AdminMessage {
  id: string
  userId: string
  senderUserId: string
  senderName: string
  fromAdmin: boolean
  content: string
  isRead: boolean
  createdAt: string
}

export default function AdminChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<AdminMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [unread, setUnread] = useState(0)
  const [error, setError] = useState('')

  const connectionRef = useRef<signalR.HubConnection | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const myId = sessionStorage.getItem('userId')
  const role = sessionStorage.getItem('globalRole')

  useEffect(() => {
    if (!myId || role === 'Admin') return
    loadUnread()
    const handler = () => setOpen(true)
    window.addEventListener('openAdminChat', handler)
    return () => window.removeEventListener('openAdminChat', handler)
  }, [myId, role])

  useEffect(() => {
    if (!myId || role === 'Admin') return
    const token = sessionStorage.getItem('token')
    if (!token) return

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${import.meta.env.VITE_API_URL || 'http://localhost:5176'}/hubs/admin-chat`, { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .build()

    connection.on('NewMessage', (msg: AdminMessage) => {
      if (msg.userId !== myId) return
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      if (msg.fromAdmin && !open) {
        setUnread((u) => u + 1)
      }
    })

    connection.start()
      .then(() => connection.invoke('JoinUserThread'))
      .catch((err) => console.error('AdminChat SignalR error', err))

    connectionRef.current = connection
    return () => { connection.stop() }
  }, [myId, open])

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, open])

  useEffect(() => {
    if (open) {
      loadThread()
      setUnread(0)
    }
  }, [open])

  const loadUnread = async () => {
    try {
      const res = await api.get<{ count: number }>('/admin-chat/my-unread-count')
      setUnread(res.data.count)
    } catch { /* ignore */ }
  }

  const loadThread = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get<AdminMessage[]>('/admin-chat/my-thread')
      setMessages(res.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити чат')
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    const content = input.trim()
    if (!content || sending) return
    setSending(true)
    setError('')
    try {
      await api.post('/admin-chat/send', { content })
      setInput('')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося надіслати')
    } finally {
      setSending(false)
    }
  }

  if (role === 'Admin' || !myId) return null

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg p-4 transition-transform hover:scale-105"
          title="Зв'язатися з адміністратором"
        >
          <MessageCircle className="w-6 h-6" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-40 w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-3rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-sm">Підтримка</p>
                <p className="text-xs text-white/80">Зв'язок з адміністрацією</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 bg-slate-50 space-y-2">
            {loading ? (
              <p className="text-center text-slate-400 text-sm py-8">Завантаження…</p>
            ) : messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500 font-medium">Привіт!</p>
                <p className="text-xs text-slate-400 mt-1">Опишіть проблему — адмін відповість як зможе</p>
              </div>
            ) : (
              messages.map((m) => {
                const mine = !m.fromAdmin
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                      mine ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                    }`}>
                      {!mine && (
                        <p className="text-xs font-semibold text-primary-700 mb-0.5">
                          {m.senderName}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                      <p className={`text-[10px] mt-1 ${mine ? 'text-white/70' : 'text-slate-400'}`}>
                        {formatRelativeTime(m.createdAt)}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="border-t border-slate-200 p-2 bg-white">
            {error && (
              <div className="text-xs text-red-600 mb-1 px-2">{error}</div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Напишіть повідомлення…"
                rows={1}
                maxLength={4000}
                className="flex-1 resize-none px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 max-h-24"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="bg-primary-600 hover:bg-primary-700 text-white p-2 rounded-lg disabled:opacity-50 flex-shrink-0"
                title="Надіслати"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 px-1">Enter — надіслати, Shift+Enter — новий рядок</p>
          </div>
        </div>
      )}
    </>
  )
}
