import { useState, useEffect, FormEvent } from 'react'
import api from '../../api/client'
import type { User } from '../../types'

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [editing, setEditing] = useState<boolean>(false)
  const [form, setForm] = useState({ firstName: '', lastName: '' })
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const response = await api.get<User>('/users/me')
      setUser(response.data)
      setForm({ firstName: response.data.firstName, lastName: response.data.lastName })
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося завантажити профіль')
    }
  }

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      const response = await api.put<User>('/users/me', form)
      setUser(response.data)
      setEditing(false)
      setSuccess('Профіль оновлено')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не вдалося оновити')
    }
  }

  if (!user) return <div className="p-6">Завантаження...</div>

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Профіль</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-2 mb-4 text-sm">
          {success}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        {editing ? (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ім'я</label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Прізвище</label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700">
                Зберегти
              </button>
              <button type="button" onClick={() => setEditing(false)} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-200">
                Скасувати
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-sm text-slate-500">Ім'я</p>
              <p className="font-medium text-slate-900">{user.fullName}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Email</p>
              <p className="font-medium text-slate-900">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">ID користувача</p>
              <p className="font-mono text-sm text-slate-700">{user.id}</p>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 mt-2"
            >
            Редагувати профіль
            </button>
          </div>
        )}
      </div>
    </div>
  )
}