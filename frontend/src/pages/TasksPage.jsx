import { useEffect, useState } from "react";
import api from "../services/api";

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "ToDo",
    priority: "Medium",
    projectId: "",
    dueDate: ""
  });

  useEffect(() => {
    loadProjects();
    loadTasks();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await api.get("/projects");
      setProjects(response.data);
    } catch (error) {
      setMessage(error.response?.data?.message || "Не вдалося завантажити проєкти");
    }
  };

  const loadTasks = async () => {
    try {
      const response = await api.get("/tasks");
      setTasks(response.data);
    } catch (error) {
      setMessage(error.response?.data?.message || "Не вдалося завантажити задачі");
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

    if (!form.projectId) {
      setMessage("Оберіть проєкт");
      return;
    }

    try {
      await api.post("/tasks", {
        title: form.title,
        description: form.description,
        status: form.status,
        priority: form.priority,
        projectId: form.projectId
      });

      setMessage("Задачу створено");

      setForm({
        title: "",
        description: "",
        status: "ToDo",
        priority: "Medium",
        projectId: "",
        dueDate: ""
      });

      loadTasks();
    } catch (error) {
      console.log(error);
      setMessage(error.response?.data?.message || "Не вдалося створити задачу");
    }
  };

  const handleDelete = async (id) => {
    setMessage("");

    try {
      await api.delete(`/tasks/${id}`);
      setMessage("Задачу видалено");
      loadTasks();
    } catch (error) {
      console.log(error);
      setMessage(error.response?.data?.message || "Не вдалося видалити задачу");
    }
  };

  const getNextStatus = (status) => {
    if (status === "ToDo") return "InProgress";
    if (status === "InProgress") return "Done";
    return "ToDo";
  };

  const handleChangeStatus = async (task) => {
    setMessage("");

    try {
      await api.put(`/tasks/${task.id}`, {
        title: task.title,
        description: task.description,
        status: getNextStatus(task.status),
        priority: task.priority,
        teamId: task.teamId ?? null,
        assigneeUserId: task.assigneeUserId ?? null,
        dueDate: task.dueDate ?? null
      });

      setMessage("Статус задачі оновлено");
      loadTasks();
    } catch (error) {
      console.log(error);
      setMessage(error.response?.data?.message || "Не вдалося оновити статус");
    }
  };

  return (
    <div>
      <h1>Tasks</h1>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          maxWidth: "400px",
          marginBottom: "20px"
        }}
      >
        <input
          type="text"
          name="title"
          placeholder="Task title"
          value={form.title}
          onChange={handleChange}
        />

        <input
          type="text"
          name="description"
          placeholder="Task description"
          value={form.description}
          onChange={handleChange}
        />

        <select name="status" value={form.status} onChange={handleChange}>
          <option value="ToDo">ToDo</option>
          <option value="InProgress">InProgress</option>
          <option value="Done">Done</option>
        </select>

        <select name="priority" value={form.priority} onChange={handleChange}>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>

        <select name="projectId" value={form.projectId} onChange={handleChange}>
          <option value="">Select project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.title}
            </option>
          ))}
        </select>

        <input
          type="date"
          name="dueDate"
          value={form.dueDate}
          onChange={handleChange}
        />

        <button type="submit">Create task</button>
      </form>

      {message && <p>{message}</p>}

      {tasks.length === 0 ? (
        <p>Задач поки немає.</p>
      ) : (
        <ul>
          {tasks.map((task) => (
            <li key={task.id} style={{ marginBottom: "10px" }}>
              <strong>{task.title}</strong> — {task.status} / {task.priority}

              <button
                onClick={() => handleChangeStatus(task)}
                style={{ marginLeft: "10px" }}
              >
                Change status
              </button>

              <button
                onClick={() => handleDelete(task.id)}
                style={{ marginLeft: "10px" }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}