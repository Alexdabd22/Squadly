import { useEffect, useState, useRef, ChangeEvent } from 'react'
import {
  FileImage,
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileVideo,
  FileAudio,
  File,
  Download,
  X,
  Paperclip,
} from 'lucide-react'
import api from '../../api/client'
import type { TaskAttachment } from '../../types'
import { formatRelativeTime } from '../../utils/date'
import ConfirmDialog from './ConfirmDialog'
import { useConfirm } from '../../hooks/useConfirm'

interface TaskAttachmentsProps {
  taskId: string
}

export default function TaskAttachments({ taskId }: TaskAttachmentsProps) {
  const [attachments, setAttachments] = useState<TaskAttachment[]>([])
  const [uploading, setUploading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentUserId = sessionStorage.getItem('userId')
  const { confirm, confirmProps } = useConfirm()

  useEffect(() => {
    loadAttachments()
  }, [taskId])

  const loadAttachments = async () => {
    try {
      const response = await api.get<TaskAttachment[]>(`/attachments/task/${taskId}`)
      setAttachments(response.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити файли')
    }
  }

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setError('Файл занадто великий (макс. 10 МБ)')
      return
    }

    setUploading(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await api.post<TaskAttachment>(
        `/attachments/task/${taskId}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      setAttachments((prev) => [response.data, ...prev])
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити файл')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (attachmentId: string) => {
    const ok = await confirm({
      title: 'Видалення файлу',
      message: 'Ви впевнені, що хочете видалити цей файл?',
      confirmText: 'Видалити',
      confirmVariant: 'danger',
    })
    if (!ok) return

    try {
      await api.delete(`/attachments/${attachmentId}`)
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося видалити')
    }
  }

  const handleDownload = async (attachment: TaskAttachment) => {
    try {
      const response = await api.get(`/attachments/${attachment.id}/download`, {
        responseType: 'blob',
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', attachment.originalFileName)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити файл')
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} Б`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
  }

  const getFileIcon = (contentType: string) => {
    const iconClass = 'w-6 h-6 flex-shrink-0'

    if (contentType.startsWith('image/')) {
      return <FileImage className={`${iconClass} text-purple-500`} />
    }
    if (contentType === 'application/pdf') {
      return <FileText className={`${iconClass} text-red-500`} />
    }
    if (contentType.includes('word') || contentType.includes('document')) {
      return <FileText className={`${iconClass} text-blue-500`} />
    }
    if (contentType.includes('sheet') || contentType.includes('excel')) {
      return <FileSpreadsheet className={`${iconClass} text-green-500`} />
    }
    if (contentType.includes('zip') || contentType.includes('rar') || contentType.includes('compressed')) {
      return <FileArchive className={`${iconClass} text-amber-500`} />
    }
    if (contentType.startsWith('video/')) {
      return <FileVideo className={`${iconClass} text-pink-500`} />
    }
    if (contentType.startsWith('audio/')) {
      return <FileAudio className={`${iconClass} text-indigo-500`} />
    }
    return <File className={`${iconClass} text-slate-500`} />
  }

  return (
    <div className="border-t border-slate-100 pt-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-slate-700">
          Файли ({attachments.length}):
        </p>
        <label className="text-sm bg-primary-600 hover:bg-primary-700 text-white px-3 py-1 rounded-lg font-medium cursor-pointer disabled:opacity-50 inline-flex items-center gap-1">
          <Paperclip className="w-4 h-4" />
          {uploading ? 'Завантаження...' : 'Прикріпити файл'}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-2 text-xs">
          {error}
        </div>
      )}

      {attachments.length === 0 ? (
        <p className="text-sm text-slate-400">Файлів поки немає.</p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((att) => {
            const isMine = att.uploadedByUserId === currentUserId

            return (
              <li
                key={att.id}
                className="bg-slate-50 rounded-lg p-3 flex items-center gap-3"
              >
                {getFileIcon(att.contentType)}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {att.originalFileName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatFileSize(att.fileSize)} · {att.uploadedByName} ·{' '}
                    {formatRelativeTime(att.createdAt)}
                  </p>
                </div>

                <button
                  onClick={() => handleDownload(att)}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium px-2 py-1 inline-flex items-center gap-1"
                  title="Завантажити"
                >
                  <Download className="w-4 h-4" />
                  Завантажити
                </button>

                {isMine && (
                  <button
                    onClick={() => handleDelete(att.id)}
                    className="text-red-600 hover:text-red-700 p-1"
                    title="Видалити"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog {...confirmProps} />
    </div>
  )
}