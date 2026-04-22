import { useEffect, useState } from "react";
import api from "../services/api";

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: ""
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await api.get("/projects");
      setProjects(response.data);
    } catch (error) {
      setMessage(error.response?.data?.message || "Не вдалося завантажити проєкти");
      setIsError(true);
    }
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);

    try {
      await api.post("/projects", form);
      setForm({ title: "", description: "" });
      setMessage("Проєкт створено");
      loadProjects();
    } catch (error) {
      setMessage(error.response?.data?.message || "Не вдалося створити проєкт");
      setIsError(true);
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
                <div className="card-title">{project.title}</div>
                {project.description && (
                  <div className="card-meta">{project.description}</div>
                )}
                <div className="detail-row">
                  <span className="label">ID:</span>
                  <code style={{ fontSize: 12 }}>{project.id}</code>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}