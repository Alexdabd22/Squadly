import { useEffect, useState } from 'react'
import { FileText, FileSpreadsheet, Download, User as UserIcon, FolderOpen } from 'lucide-react'
import api from '../../api/client'
import type { Project } from '../../types'

export default function ReportsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [downloading, setDownloading] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const response = await api.get<Project[]>('/projects')
      setProjects(response.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити проєкти')
    } finally {
      setLoading(false)
    }
  }

  const downloadFile = async (url: string, filename: string, key: string) => {
    setDownloading(key)
    setError('')
    try {
      const response = await api.get(url, { responseType: 'blob' })
      const disposition = response.headers['content-disposition']
      let finalName = filename
      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/)
        if (match) finalName = match[1]
      }

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = blobUrl
      link.setAttribute('download', finalName)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(blobUrl)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити файл')
    } finally {
      setDownloading('')
    }
  }

  const downloadProjectPdf = (project: Project) => {
    downloadFile(
      `/reports/project/${project.id}/pdf`,
      `project_${project.title}_${new Date().toISOString().slice(0, 10)}.pdf`,
      `project-pdf-${project.id}`
    )
  }

  const downloadProjectExcel = (project: Project) => {
    downloadFile(
      `/reports/project/${project.id}/excel`,
      `project_${project.title}_${new Date().toISOString().slice(0, 10)}.xlsx`,
      `project-excel-${project.id}`
    )
  }

  const downloadMyReport = () => {
    downloadFile(
      `/reports/user/me/pdf`,
      `my_report_${new Date().toISOString().slice(0, 10)}.pdf`,
      `my-report`
    )
  }

  if (loading) {
    return <div className="p-6 text-slate-500">Завантаження...</div>
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">📄 Звіти</h1>
        <p className="text-sm text-slate-500 mt-1">Генерація звітів у форматі PDF та Excel</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Особистий звіт */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
            <UserIcon className="w-6 h-6 text-primary-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-slate-900 mb-1">Мій особистий звіт</h2>
            <p className="text-sm text-slate-600 mb-3">
              Включає вашу статистику, рейтинг балів, призначені задачі та активність.
            </p>
            <button
              onClick={downloadMyReport}
              disabled={downloading === 'my-report'}
              className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 text-sm"
            >
              <FileText className="w-4 h-4" />
              {downloading === 'my-report' ? 'Генерація...' : 'Завантажити PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* Звіти по проєктах */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center gap-3 mb-4">
          <FolderOpen className="w-5 h-5 text-slate-600" />
          <h2 className="font-semibold text-slate-900">Звіти по проєктах</h2>
        </div>

        {projects.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">
            Проєктів поки немає. Створіть проєкт, щоб згенерувати звіт.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {projects.map((project) => {
              const pdfKey = `project-pdf-${project.id}`
              const excelKey = `project-excel-${project.id}`
              const isPdfLoading = downloading === pdfKey
              const isExcelLoading = downloading === excelKey

              return (
                <div key={project.id} className="py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{project.title}</p>
                    {project.description && (
                      <p className="text-sm text-slate-500 truncate">{project.description}</p>
                    )}
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => downloadProjectPdf(project)}
                      disabled={isPdfLoading}
                      className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
                      title="Завантажити PDF"
                    >
                      <FileText className="w-4 h-4" />
                      {isPdfLoading ? '...' : 'PDF'}
                    </button>

                    <button
                      onClick={() => downloadProjectExcel(project)}
                      disabled={isExcelLoading}
                      className="inline-flex items-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
                      title="Завантажити Excel"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      {isExcelLoading ? '...' : 'Excel'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Інформація */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <Download className="w-4 h-4" />
          Як використовувати звіти?
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>PDF</strong> — зручно для друку та відправки клієнту/керівнику</li>
          <li>• <strong>Excel</strong> — для подальшого аналізу даних, фільтрації та сортування</li>
          <li>• Звіти генеруються в реальному часі з актуальних даних бази</li>
          <li>• Файли зберігаються у папку Завантаження вашого браузера</li>
        </ul>
      </div>
    </div>
  )
}