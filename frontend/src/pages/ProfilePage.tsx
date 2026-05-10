import { useState, useEffect, FormEvent } from 'react'
import api from '../services/api'
import type { User } from '../types'

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
      setError(err.response?.data?.message || 'Failed to load profile')
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
      setSuccess('Profile updated')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update')
    }
  }

  if (!user) return <div className="page">Loading...</div>

  return (
    <div className="page">
      <h1>Profile</h1>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {editing ? (
        <form onSubmit={handleUpdate} className="form">
          <input
            type="text"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            placeholder="First Name"
            required
          />
          <input
            type="text"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            placeholder="Last Name"
            required
          />
          <button type="submit">Save</button>
          <button type="button" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <div className="card">
          <p><strong>Name:</strong> {user.fullName}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>ID:</strong> {user.id}</p>
          <button onClick={() => setEditing(true)}>Edit Profile</button>
        </div>
      )}
    </div>
  )
}
