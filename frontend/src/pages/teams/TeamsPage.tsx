import { useState, useEffect, FormEvent } from 'react'
import api from '../../api/client'
import type { Team, Project, CreateTeamRequest } from '../../types'

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [form, setForm] = useState<CreateTeamRequest>({ name: '', description: '', projectId: '' })
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [teamsRes, projectsRes] = await Promise.all([
        api.get<Team[]>('/teams'),
        api.get<Project[]>('/projects'),
      ])
      setTeams(teamsRes.data)
      setProjects(projectsRes.data)
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
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Teams</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6 space-y-3">
        <h2 className="font-semibold text-slate-900">Create team</h2>
        <input
          type="text"
          placeholder="Team name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          required
        />
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <select
          value={form.projectId}
          onChange={(e) => setForm({ ...form, projectId: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          required
        >
          <option value="">Select project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Team'}
        </button>
      </form>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teams.length === 0 && (
          <p className="col-span-full text-center text-slate-500 py-12">No teams yet.</p>
        )}
        {teams.map((team) => (
          <div key={team.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-1">{team.name}</h3>
            {team.description && <p className="text-sm text-slate-600">{team.description}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}