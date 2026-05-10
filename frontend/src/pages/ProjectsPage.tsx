import { useState, useEffect, FormEvent } from 'react'
import api from '../services/api'
import type { Project, CreateProjectRequest } from '../types'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [form, setForm] = useState<CreateProjectRequest>({ title: '', description: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<CreateProjectRequest>({ title: '', description: '' })
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const response = await api.get<Project[]>('/projects')
      setProjects(response.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load projects')
    }
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/projects', form)
      setForm({ title: '', description: '' })
      loadProjects()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Видалити цей проєкт?')) return
    try {
      await api.delete(`/projects/${id}`)
      loadProjects()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete')
    }
  }

  const startEdit = (project: Project) => {
    setEditingId(project.id)
    setEditForm({ title: project.title, description: project.description || '' })
  }

  const handleUpdate = async (id: string) => {
    try {
      await api.put(`/projects/${id}`, editForm)
      setEditingId(null)
      loadProjects()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update')
    }
  }

  return (
    <div className="page">
      <h1>Projects</h1>
      {error && <div className="error">{error}</div>}

      <form onSubmit={handleCreate} className="form">
        <input
          type="text"
          placeholder="Project title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Project'}
        </button>
      </form>

      <div className="list">
        {projects.map((project) => (
          <div key={project.id} className="card">
            {editingId === project.id ? (
              <>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
                <button onClick={() => handleUpdate(project.id)}>Save</button>
                <button onClick={() => setEditingId(null)}>Cancel</button>
              </>
            ) : (
              <>
                <h3>{project.title}</h3>
                {project.description && <p>{project.description}</p>}
                <button onClick={() => startEdit(project)}>Edit</button>
                <button onClick={() => handleDelete(project.id)}>Delete</button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}