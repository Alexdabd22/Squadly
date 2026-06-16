import { useEffect, useRef, useState } from 'react'
import * as signalR from '@microsoft/signalr'
import { Search, Send, MessageCircle, ArrowLeft } from 'lucide-react'
import api from '../../api/client'
import { formatRelativeTime } from '../../utils/date'
import type { GlobalRole } from '../../types'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'

interface Thread {
  userId: string
  fullName: string
  email: string
  globalRole: GlobalRole
  lastMessage?: string
  lastMessageAt?: string
  lastMessageFromAdmin: boolean
  unreadFromUser: number
}

interface Message {
  id: string
  userId: string
  senderUserId: string
  senderName: string
  fromAdmin: boolean
  content: string
  isRead: boolean
  createdAt: string
}

const ROLE_LABEL: Record<GlobalRole, string> = {
  Admin: 'Адмін',
  Organizer: 'Організатор',
  User: 'Користувач',
}

const ROLE_BADGE: Record<GlobalRole, string> = {
  Admin: 'bg-red-100 text-red-700',
  Organizer: 'bg-primary-100 text-primary-700',
  User: 'bg-slate-100 text-slate-700',
}

export default function AdminChatPage() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [changingRole, setChangingRole] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const connectionRef = useRef<signalR.HubConnection | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { confirm, confirmProps } = useConfirm()

  const selectedThread = threads.find((t) => t.userId === selectedUserId)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => loadThreads(search), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  const loadThreads = async (q: string) => {
    setLoadingThreads(true)
    try {
      const res = await api.get<Thread[]>(`/admin-chat/threads${q ? `?search=${encodeURIComponent(q)}` : ''}`)
      setThreads(res.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити діалоги')
    } finally {
      setLoadingThreads(false)
    }
  }

  useEffect(() => {
    const token = sessionStorage.getItem('token')
    if (!token) return

    const connection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5176/hubs/admin-chat', { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .build()

    connection.on('NewMessage', (msg: Message) => {
      if (msg.userId === selectedUserId) {
        setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg])
      }
      loadThreads(search)
    })

    connection.start()
      .then(() => connection.invoke('JoinAdminPool'))
      .catch((err) => console.error('AdminChat SignalR error', err))

    connectionRef.current = connection
    return () => { connection.stop() }
  }, [selectedUserId, search])

  useEffect(() => {
    if (!selectedUserId) {
      setMessages([])
      return
    }
    setLoadingMsgs(true)
    api.get<Message[]>(`/admin-chat/threads/${selectedUserId}`)
      .then((res) => setMessages(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Не вдалося завантажити повідомлення'))
      .finally(() => setLoadingMsgs(false))

    const c = connectionRef.current
    if (c && c.state === signalR.HubConnectionState.Connected) {
      c.invoke('JoinAdminThreadFor', selectedUserId).catch(() => {})
    }
    return () => {
      if (c && c.state === signalR.HubConnectionState.Connected) {
        c.invoke('LeaveAdminThreadFor', selectedUserId).catch(() => {})
      }
    }
  }, [selectedUserId])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const handleSend = async () => {
    if (!selectedUserId) return
    const content = input.trim()
    if (!content || sending) return
    setSending(true)
    setError('')
    try {
      await api.post(`/admin-chat/threads/${selectedUserId}/send`, { content })
      setInput('')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося надіслати')
    } finally {
      setSending(false)
    }
  }

  const handleChangeRole = async (newRole: GlobalRole) => {
    if (!selectedThread || selectedThread.globalRole === newRole) return
    const ok = await confirm({
      title: 'Зміна ролі',
      message: `Змінити роль «${selectedThread.fullName}» на «${ROLE_LABEL[newRole]}»?`,
      confirmText: 'Змінити',
      confirmVariant: 'danger',
    })
    if (!ok) return

    setChangingRole(true)
    try {
      await api.put(`/admin/users/${selectedThread.userId}/global-role`, { globalRole: newRole })
      setThreads((prev) => prev.map((t) =>
        t.userId === selectedThread.userId ? { ...t, globalRole: newRole } : t
      ))
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося змінити роль')
    } finally {
      setChangingRole(false)
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Звернення користувачів</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Відповідайте на запитання користувачів. Тут же можна змінити роль користувача.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
        {/* ── Список тредів ── */}
        <div className={`${selectedUserId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-slate-200`}>
          <div className="p-3 border-b border-slate-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Пошук по email або імені…"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingThreads ? (
              <p className="text-center text-slate-400 text-sm py-8">Завантаження…</p>
            ) : threads.length === 0 ? (
              <div className="text-center py-10 px-4">
                <MessageCircle className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  {search ? 'Нічого не знайдено' : 'Поки немає звернень'}
                </p>
              </div>
            ) : (
              threads.map((t) => (
                <button
                  key={t.userId}
                  onClick={() => setSelectedUserId(t.userId)}
                  className={`w-full text-left px-3 py-3 border-b border-slate-100 hover:bg-slate-50 transition ${
                    selectedUserId === t.userId ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold flex-shrink-0">
                      {t.fullName[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-medium text-sm text-slate-900 truncate">{t.fullName}</p>
                        {t.lastMessageAt && (
                          <span className="text-[10px] text-slate-400 flex-shrink-0">
                            {formatRelativeTime(t.lastMessageAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{t.email}</p>
                      {t.lastMessage && (
                        <p className="text-xs text-slate-600 truncate mt-0.5">
                          {t.lastMessageFromAdmin && <span className="text-slate-400">Ви: </span>}
                          {t.lastMessage}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${ROLE_BADGE[t.globalRole]}`}>
                          {ROLE_LABEL[t.globalRole]}
                        </span>
                        {t.unreadFromUser > 0 && (
                          <span className="text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold">
                            {t.unreadFromUser}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Панель чату ── */}
        <div className={`${selectedUserId ? 'flex' : 'hidden md:flex'} flex-col flex-1`}>
          {!selectedThread ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p>Оберіть діалог зі списку</p>
              </div>
            </div>
          ) : (
            <>
              <div className="border-b border-slate-200 px-4 py-3 flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => setSelectedUserId(null)}
                  className="md:hidden text-slate-500 hover:text-slate-700"
                  title="Назад"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold flex-shrink-0">
                  {selectedThread.fullName[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{selectedThread.fullName}</p>
                  <p className="text-xs text-slate-500 truncate">{selectedThread.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Роль:</span>
                  <select
                    value={selectedThread.globalRole}
                    onChange={(e) => handleChangeRole(e.target.value as GlobalRole)}
                    disabled={changingRole}
                    className={`text-xs px-2 py-1 rounded font-medium border-0 cursor-pointer ${ROLE_BADGE[selectedThread.globalRole]} disabled:opacity-50`}
                  >
                    <option value="User">Користувач</option>
                    <option value="Organizer">Організатор</option>
                    <option value="Admin">Адміністратор</option>
                  </select>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 bg-slate-50 space-y-2">
                {loadingMsgs ? (
                  <p className="text-center text-slate-400 text-sm py-8">Завантаження…</p>
                ) : messages.length === 0 ? (
                  <p className="text-center text-slate-400 text-sm py-8">Повідомлень ще немає</p>
                ) : (
                  messages.map((m) => {
                    const adminMsg = m.fromAdmin
                    return (
                      <div key={m.id} className={`flex ${adminMsg ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                          adminMsg
                            ? 'bg-primary-600 text-white rounded-br-sm'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                        }`}>
                          {!adminMsg && (
                            <p className="text-xs font-semibold text-primary-700 mb-0.5">
                              {m.senderName}
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                          <p className={`text-[10px] mt-1 ${adminMsg ? 'text-white/70' : 'text-slate-400'}`}>
                            {formatRelativeTime(m.createdAt)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="border-t border-slate-200 p-2 bg-white">
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
                    placeholder="Ваша відповідь…"
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
                <p className="text-[10px] text-slate-400 mt-1 px-1">
                  Enter — надіслати, Shift+Enter — новий рядок
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog {...confirmProps} />
    </div>
  )
}
