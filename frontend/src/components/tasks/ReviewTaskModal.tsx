import { useState } from 'react'
import { X, Check, Undo2 } from 'lucide-react'
import api from '../../api/client'

interface Props {
  open: boolean
  taskId: string
  taskTitle: string
  onClose: () => void
  onReviewed: () => void
}

export default function ReviewTaskModal({ open, taskId, taskTitle, onClose, onReviewed }: Props) {
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState<'accept' | 'return' | null>(null)
  const [error, setError] = useState('')

  if (!open) return null

  const handleAccept = async () => {
    setLoading('accept')
    setError('')
    try {
      await api.post(`/tasks/${taskId}/accept`, { comment: comment.trim() || null })
      onReviewed()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося прийняти')
    } finally {
      setLoading(null)
    }
  }

  const handleReturn = async () => {
    if (!comment.trim()) {
      setError('Вкажіть причину повернення')
      return
    }
    setLoading('return')
    setError('')
    try {
      await api.post(`/tasks/${taskId}/return`, { comment: comment.trim() })
      onReviewed()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося повернути')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Перевірка задачі</h2>
            <p className="text-sm text-slate-500 truncate max-w-sm">{taskTitle}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Коментар {' '}
              <span className="text-slate-400 font-normal">(обов'язковий при поверненні)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Коментар до перевірки..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button onClick={onClose} disabled={loading !== null} className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700">
            Скасувати
          </button>
          <button
            onClick={handleReturn}
            disabled={loading !== null}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50"
          >
            <Undo2 className="w-4 h-4" />
            {loading === 'return' ? 'Повернення…' : 'Повернути'}
          </button>
          <button
            onClick={handleAccept}
            disabled={loading !== null}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {loading === 'accept' ? 'Прийняття…' : 'Прийняти'}
          </button>
        </div>
      </div>
    </div>
  )
}