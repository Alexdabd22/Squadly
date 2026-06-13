import { useState } from 'react'
import { FileText, FileSpreadsheet } from 'lucide-react'
import api from '../../api/client'

interface Props {
  projectId: string
  projectTitle: string
}

export default function ProjectReportTab({ projectId, projectTitle }: Props) {
  const [loading, setLoading] = useState<'pdf' | 'excel' | null>(null)
  const [error, setError] = useState('')

  const download = async (kind: 'pdf' | 'excel') => {
    setError('')
    setLoading(kind)
    try {
      const res = await api.get(`/reports/project/${projectId}/${kind}`, {
        responseType: 'blob',
      })
      const ext = kind === 'pdf' ? 'pdf' : 'xlsx'
      const blob = new Blob([res.data])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${projectTitle.replace(/\s+/g, '_')}_${new Date()
        .toISOString()
        .slice(0, 10)}.${ext}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      setError('Не вдалося завантажити звіт')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Завантаж звіт по проєкту у зручному форматі. PDF — для презентації, Excel — для подальшого
        аналізу.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => download('pdf')}
          disabled={loading !== null}
          className="bg-white border border-slate-200 hover:border-primary-400 rounded-2xl p-5 text-left transition-colors disabled:opacity-50"
        >
          <FileText className="w-8 h-8 text-red-500 mb-2" />
          <p className="font-semibold text-slate-900">PDF-звіт</p>
          <p className="text-xs text-slate-500 mb-3">
            Підсумок проєкту з таблицею задач, форматований для друку
          </p>
          <span className="text-sm text-primary-600 font-medium">
            {loading === 'pdf' ? 'Створення…' : 'Завантажити PDF →'}
          </span>
        </button>

        <button
          onClick={() => download('excel')}
          disabled={loading !== null}
          className="bg-white border border-slate-200 hover:border-primary-400 rounded-2xl p-5 text-left transition-colors disabled:opacity-50"
        >
          <FileSpreadsheet className="w-8 h-8 text-green-500 mb-2" />
          <p className="font-semibold text-slate-900">Excel-звіт</p>
          <p className="text-xs text-slate-500 mb-3">
            Усі задачі проєкту як спредшит для подальшої обробки
          </p>
          <span className="text-sm text-primary-600 font-medium">
            {loading === 'excel' ? 'Створення…' : 'Завантажити XLSX →'}
          </span>
        </button>
      </div>
    </div>
  )
}