import { useEffect, useState } from "react";
import api from "../services/api";

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null); 

  const [form, setForm] = useState({
    title: "",
    description: ""
  });

  const [editForm, setEditForm] = useState({
    title: "",
    description: ""
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const showMessage = (text, error = false) => {
    setMessage(text);
    setIsError(error);
  };

  const loadProjects = async () => {
    try {
      const response = await api.get("/projects");
      setProjects(response.data);
    } catch (error) {
      showMessage(error.response?.data?.message || "Не вдалося завантажити проєкти", true);
    }
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleEditChange = (e) => {
    setEditForm({
      ...editForm,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      await api.post("/projects", form);
      setForm({ title: "", description: "" });
      showMessage("Проєкт створено");
      loadProjects();
    } catch (error) {
      showMessage(error.response?.data?.message || "Не вдалося створити проєкт", true);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Видалити цей проєкт?")) return;

    setMessage("");
    try {
      await api.delete(`/projects/${id}`);
      showMessage("Проєкт видалено");
      loadProjects();
    } catch (error) {
      showMessage(error.response?.data?.message || "Не вдалося видалити проєкт", true);
    }
  };

  const startEdit = (project) => {
    setEditingProjectId(project.id);
    setEditForm({
      title: project.title || "",
      description: project.description || ""
    });
  };

  const cancelEdit = () => {
    setEditingProjectId(null);
    setEditForm({
      title: "",
      description: ""
    });
  };

  const handleUpdate = async (projectId) => {
    setMessage("");
    try {
      await api.put(`/projects/${projectId}`, {
        title: editForm.title,
        description: editForm.description
      });

      showMessage("Проєкт оновлено");
      setEditingProjectId(null);
      loadProjects();
    } catch (error) {
      showMessage(error.response?.data?.message || "Не вдалося оновити проєкт", true);
    }
  };

  return (
    <div>
      <h1>Projects</h1>

      <div className="card">
        <h2>Create project</h2>
        <form onSubmit={handleSubmit} className="form">
          <label>Title</label>
          <input
            type="text"
            name="title"
            placeholder="Project title"
            value={form.title}
            onChange={handleChange}
            required
          />

          <label>Description</label>
          <input
            type="text"
            name="description"
            placeholder="Project description"
            value={form.description}
            onChange={handleChange}
          />

          <button type="submit">Create project</button>
        </form>
      </div>

      {message && (
        <div className={`message ${isError ? "error" : "success"}`}>
          {message}
        </div>
      )}

      <h2>All projects</h2>
      {projects.length === 0 ? (
        <div className="empty-state">Проєктів поки немає.</div>
      ) : (
        <ul className="plain-list">
          {projects.map((project) => (
            <li key={project.id}>
              <div className="card">
                {editingProjectId === project.id ? (
                  <div className="edit-form">
                    <label>Title</label>
                    <input
                      type="text"
                      name="title"
                      className="field"
                      value={editForm.title}
                      onChange={handleEditChange}
                      required
                    />

                    <label>Description</label>
                    <input
                      type="text"
                      name="description"
                      className="field"
                      value={editForm.description}
                      onChange={handleEditChange}
                    />

                    <div className="btn-group" style={{ marginTop: 8 }}>
                      <button onClick={() => handleUpdate(project.id)}>Save</button>
                      <button className="btn-secondary" onClick={cancelEdit}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="card-title">{project.title}</div>
                    {project.description && (
                      <div className="card-meta">{project.description}</div>
                    )}
                    <div className="detail-row">
                      <span className="label">ID:</span>
                      <code style={{ fontSize: 12 }}>{project.id}</code>
                    </div>

                    <div className="btn-group" style={{ marginTop: 10 }}>
                      <button className="btn-small btn-secondary" onClick={() => startEdit(project)}>
                        Edit
                      </button>
                      <button className="btn-small btn-danger" onClick={() => handleDelete(project.id)}>
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}