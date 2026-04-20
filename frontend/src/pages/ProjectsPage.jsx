import { useEffect, useState } from "react";
import api from "../services/api";

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [message, setMessage] = useState("");
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

    try {
      await api.post("/projects", form);
      setForm({ title: "", description: "" });
      loadProjects();
    } catch (error) {
      setMessage(error.response?.data?.message || "Не вдалося створити проєкт");
    }
  };

  return (
    <div>
      <h1>Projects</h1>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "400px", marginBottom: "20px" }}
      >
        <input
          type="text"
          name="title"
          placeholder="Project title"
          value={form.title}
          onChange={handleChange}
        />

        <input
          type="text"
          name="description"
          placeholder="Project description"
          value={form.description}
          onChange={handleChange}
        />

        <button type="submit">Create project</button>
      </form>

      {message && <p>{message}</p>}

      {projects.length === 0 ? (
        <p>Проєктів поки немає.</p>
      ) : (
        <ul>
          {projects.map((project) => (
            <li key={project.id}>
              <strong>{project.title}</strong>
              {project.description && <span> — {project.description}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}