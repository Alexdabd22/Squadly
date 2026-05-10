import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import type { RegisterRequest } from '../types'

export default function RegisterPage() {
  const [form, setForm] = useState<RegisterRequest>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  })
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.post('/auth/register', form)
      navigate('/login')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <h1>Register</h1>
      <form onSubmit={handleSubmit} className="form">
        {error && <div className="error">{error}</div>}
        <input
          type="text"
          placeholder="First Name"
          value={form.firstName}
          onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Last Name"
          value={form.lastName}
          onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Register'}
        </button>
        <p>
          Have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  )
}