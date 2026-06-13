import { useState } from 'react'
import api from '../../api/client'
import type { TaskComment } from '../../types'
import { formatRelativeTime } from '../../utils/date'
import ConfirmDialog from '../common/ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'

interface Props {
  taskId: string
  comments: TaskComment[]
  onChanged: () => void
}

export default function TaskComments({ taskId, comments, onChanged }: Props) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const currentUserId = sessionStorage.getItem('userId')
  const { confirm, confirmProps } = useConfirm()

  const handleAdd = async () => {
    const value = text.trim()
    if (!value) return
    setSending(true)
    setError('')
    try {
      await api.post(`/tasks/${taskId}/comments`, { content: value })
      setText('')
      onChanged()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося додати коментар')
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async (commentId: string) => {
    const ok = await confirm({
      title: 'Видалення коментаря',
      message: 'Видалити цей коментар?',
      confirmText: 'Видалити',
      confirmVariant: 'danger',
    })
    if (!ok) return

    try {
      await api.delete(`/tasks/${taskId}/comments/${commentId}`)
      onChanged()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося видалити')
    }
  }

  return (
    <div>
      <p className="text-sm font-semibold text-slate-700 mb-2">
        Коментарі ({comments.length})
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-2 text-xs">
          {error}
        </div>
      )}

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Новий коментар"
          className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          onClick={handleAdd}
          disabled={sending || !text.trim()}
          className="text-sm bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
        >
          Додати
        </button>
      </div>

      {comments.length === 0 ? (
        <p className="text-sm text-slate-400">Коментарів поки немає.</p>
      ) : (
        <ul className="space-y-2">
          {comments.map((comment) => {
            const isMine = comment.authorUserId === currentUserId
            return (
              <li key={comment.id} className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-semibold">
                      {(comment.author?.firstName?.[0] || '?').toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {comment.author?.fullName || 'Невідомий'}
                        {isMine && <span className="text-xs text-slate-400 ml-1">(ви)</span>}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatRelativeTime(comment.createdAt)}
                      </p>
                    </div>
                  </div>
                  {isMine && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      Видалити
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-700 ml-9 break-words">{comment.content}</p>
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog {...confirmProps} />
    </div>
  )
}