import { useEffect, useState } from 'react'
import {
  FileText, FileSpreadsheet, Download, User as UserIcon,
  FolderOpen, Info, CheckCircle2, BarChart3, Clock,
} from 'lucide-react'
import api from '../../api/client'
import type { Project } from '../../types'

export default function ReportsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [downloading, setDownloading] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => { loadProjects() }, [])

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

  const downloadProjectPdf = (project: Project) =>
    downloadFile(
      `/reports/project/${project.id}/pdf`,
      `project_${project.title}_${new Date().toISOString().slice(0, 10)}.pdf`,
      `project-pdf-${project.id}`
    )

  const downloadProjectExcel = (project: Project) =>
    downloadFile(
      `/reports/project/${project.id}/excel`,
      `project_${project.title}_${new Date().toISOString().slice(0, 10)}.xlsx`,
      `project-excel-${project.id}`
    )

  const downloadMyReport = () =>
    downloadFile(
      `/reports/user/me/pdf`,
      `my_report_${new Date().toISOString().slice(0, 10)}.pdf`,
      `my-report`
    )

  if (loading) {
    return <div className="p-6 text-slate-500">Завантаження...</div>
  }

  return (
    <div className="max-w-5xl mx-auto p-6">

      {/* Шапка */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Звіти</h1>
        </div>
        <p className="text-sm text-slate-500 ml-13 mt-1">
          Генерація аналітичних звітів у форматах PDF та Excel. Дані беруться
          в реальному часі з бази — завжди актуальні на момент завантаження.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="ml-2 text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      {/* ── Особистий звіт ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-5">
        <div className="bg-gradient-to-r from-primary-50 to-white px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-primary-600" />
            <h2 className="font-semibold text-slate-900">Особистий звіт</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Звіт про вашу особисту активність у системі</p>
        </div>
        <div className="p-5">
          {/* Що входить */}
          <div className="grid sm:grid-cols-3 gap-3 mb-5">
            <div className="flex items-start gap-2 bg-slate-50 rounded-xl p-3">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-700">Виконані задачі</p>
                <p className="text-xs text-slate-500 mt-0.5">Кількість і пріоритети</p>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-slate-50 rounded-xl p-3">
              <BarChart3 className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-700">Рейтинг балів</p>
                <p className="text-xs text-slate-500 mt-0.5">Позиція в загальному рейтингу</p>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-slate-50 rounded-xl p-3">
              <Clock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-700">Активність</p>
                <p className="text-xs text-slate-500 mt-0.5">Коментарі, здачі, дати</p>
              </div>
            </div>
          </div>
          <button
            onClick={downloadMyReport}
            disabled={downloading === 'my-report'}
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg font-medium disabled:opacity-50 text-sm shadow-sm"
          >
            <FileText className="w-4 h-4" />
            {downloading === 'my-report' ? 'Генерація PDF...' : 'Завантажити мій PDF-звіт'}
          </button>
        </div>
      </div>

      {/* ── Звіти по проєктах ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-5">
        <div className="bg-gradient-to-r from-slate-50 to-white px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-slate-600" />
            <h2 className="font-semibold text-slate-900">Звіти по проєктах</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            PDF — для презентацій та архіву · Excel — для аналізу та фільтрації
          </p>
        </div>

        {projects.length === 0 ? (
          <div className="p-10 text-center">
            <FolderOpen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">Проєктів поки немає</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {projects.map((project) => {
              const pdfKey = `project-pdf-${project.id}`
              const excelKey = `project-excel-${project.id}`
              return (
                <div key={project.id} className="px-5 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{project.title}</p>
                    {project.description && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{project.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        project.status === 'Active' ? 'bg-blue-100 text-blue-700' :
                        project.status === 'Completed' ? 'bg-green-100 text-green-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {project.status === 'Active' ? 'Активний' :
                         project.status === 'Completed' ? 'Завершено' : 'Архів'}
                      </span>
                      <span className="text-xs text-slate-400">{project.memberCount} учасн.</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => downloadProjectPdf(project)}
                      disabled={downloading === pdfKey}
                      className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      {downloading === pdfKey ? '...' : 'PDF'}
                    </button>
                    <button
                      onClick={() => downloadProjectExcel(project)}
                      disabled={downloading === excelKey}
                      className="inline-flex items-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      {downloading === excelKey ? '...' : 'Excel'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Підказка ── */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Про формати звітів</h3>
            <div className="grid sm:grid-cols-2 gap-3 text-sm text-blue-800">
              <div>
                <p className="font-medium flex items-center gap-1.5 mb-1">
                  <FileText className="w-4 h-4" /> PDF
                </p>
                <ul className="text-xs space-y-0.5 text-blue-700">
                  <li>• Зручний для друку та відправки</li>
                  <li>• Стилізований формат з таблицями</li>
                  <li>• Підходить для звітування керівнику</li>
                </ul>
              </div>
              <div>
                <p className="font-medium flex items-center gap-1.5 mb-1">
                  <FileSpreadsheet className="w-4 h-4" /> Excel
                </p>
                <ul className="text-xs space-y-0.5 text-blue-700">
                  <li>• Для подальшого аналізу та фільтрації</li>
                  <li>• Можна будувати власні графіки</li>
                  <li>• Зручне сортування задач</li>
                </ul>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-200 flex items-center gap-2 text-xs text-blue-700">
              <Download className="w-3.5 h-3.5" />
              Файли зберігаються у папку «Завантаження» браузера автоматично
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
