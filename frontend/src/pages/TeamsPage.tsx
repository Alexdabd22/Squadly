import { useState, useEffect, FormEvent } from 'react'
import api from '../services/api'
import type { Team, Project, User, CreateTeamRequest } from '../types'

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [form, setForm] = useState<CreateTeamRequest>({ name: '', description: '', projectId: '' })
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [teamsRes, projectsRes, usersRes] = await Promise.all([
        api.get<Team[]>('/teams'),
        api.get<Project[]>('/projects'),
        api.get<User[]>('/users'),
      ])
      setTeams(teamsRes.data)
      setProjects(projectsRes.data)
      setUsers(usersRes.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load data')
    }
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/teams', form)
      setForm({ name: '', description: '', projectId: '' })
      loadData()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <h1>Teams</h1>
      {error && <div className="error">{error}</div>}

      <form onSubmit={handleCreate} className="form">
        <input
          type="text"
          placeholder="Team name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <select
          value={form.projectId}
          onChange={(e) => setForm({ ...form, projectId: e.target.value })}
          required
        >
          <option value="">Select project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Team'}
        </button>
      </form>

      <div className="list">
        {teams.map((team) => (
          <div key={team.id} className="card">
            <h3>{team.name}</h3>
            {team.description && <p>{team.description}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}