import { useState } from 'react'
import { X, Send } from 'lucide-react'
import api from '../../api/client'

interface Props {
  open: boolean
  taskId: string
  taskTitle: string
  onClose: () => void
  onSubmitted: () => void
}

export default function SubmitTaskModal({ open, taskId, taskTitle, onClose, onSubmitted }: Props) {
  const [whatWasDone, setWhatWasDone] = useState('')
  const [links, setLinks] = useState<string[]>([])
  const [linkInput, setLinkInput] = useState('')
  const [hoursSpent, setHoursSpent] = useState('')
  const [selfChecked, setSelfChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const addLink = () => {
    const l = linkInput.trim()
    if (!l || links.includes(l)) { setLinkInput(''); return }
    if (links.length >= 10) { setError('Максимум 10 посилань'); return }
    setLinks([...links, l])
    setLinkInput('')
    setError('')
  }

  const handleSubmit = async () => {
    if (whatWasDone.trim().length < 10) {
      setError('Опис має бути не менше 10 символів')
      return
    }
    if (links.length === 0) {
      setError('Додайте принаймні одне посилання на виконану роботу (GitHub, Google Drive, демо тощо)')
      return
    }
    if (!selfChecked) {
      setError('Підтвердіть, що ви перевірили роботу')
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.post(`/tasks/${taskId}/submit`, {
        whatWasDone: whatWasDone.trim(),
        links,
        hoursSpent: hoursSpent ? parseFloat(hoursSpent) : null,
        selfChecked,
      })
      onSubmitted()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося здати задачу')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Здача задачі</h2>
            <p className="text-sm text-slate-500 truncate max-w-sm">{taskTitle}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Що зроблено *</label>
            <textarea
              value={whatWasDone}
              onChange={(e) => setWhatWasDone(e.target.value)}
              rows={4}
              maxLength={3000}
              placeholder="Опишіть, що було зроблено..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
            <p className="text-xs text-slate-400 mt-1">{whatWasDone.length}/3000</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Посилання * <span className="text-slate-400 font-normal">(хоча б одне — GitHub, Drive, демо)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLink())}
                placeholder="https://..."
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button onClick={addLink} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">
                Додати
              </button>
            </div>
            {links.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {links.map((l, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                    {l.length > 40 ? l.substring(0, 40) + '…' : l}
                    <button onClick={() => setLinks(links.filter((_, j) => j !== i))} className="text-blue-400 hover:text-blue-700">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Витрачено годин</label>
            <input
              type="number"
              step="0.5"
              min="0.1"
              max="999"
              value={hoursSpent}
              onChange={(e) => setHoursSpent(e.target.value)}
              placeholder="наприклад, 2.5"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selfChecked}
              onChange={(e) => setSelfChecked(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-slate-700">Я перевірив(ла) свою роботу перед здачею</span>
          </label>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700">
            Скасувати
          </button>
          <button onClick={handleSubmit} disabled={loading} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50">
            <Send className="w-4 h-4" />
            {loading ? 'Здача…' : 'Здати на перевірку'}
          </button>
        </div>
      </div>
    </div>
  )
}