import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import type { AuthResponse } from '../types'

export default function LoginPage() {
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const navigate = useNavigate()

 const handleSubmit = async (e: FormEvent) => {
  e.preventDefault()
  setError('')
  setLoading(true)

  try {
    const response = await api.post<AuthResponse>('/auth/login', { email, password })
    localStorage.setItem('token', response.data.accessToken)
    localStorage.setItem('userId', response.data.user.id)
    window.dispatchEvent(new Event('authChanged'))
    navigate('/projects')
  } catch (err: any) {
    setError(err.response?.data?.message || 'Login failed')
  } finally {
    setLoading(false)
  }
}

  return (
    <div className="page">
      <h1>Login</h1>
      <form onSubmit={handleSubmit} className="form">
        {error && <div className="error">{error}</div>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Login'}
        </button>
        <p>
          No account? <Link to="/register">Register</Link>
        </p>
      </form>
    </div>
  )
}