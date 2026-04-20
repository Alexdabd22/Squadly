import { useEffect, useState } from "react";
import api from "../services/api";

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [message, setMessage] = useState("");
  const [commentTexts, setCommentTexts] = useState({});

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
      setMessage(error.response?.data?.message || "Не вдалося оновити статус");
    }
  };

  const handleCommentChange = (taskId, value) => {
    setCommentTexts((prev) => ({
      ...prev,
      [taskId]: value
    }));
  };

  const handleAddComment = async (taskId) => {
    setMessage("");

    const text = commentTexts[taskId];
    const userId = localStorage.getItem("userId");

    if (!text || !text.trim()) {
      setMessage("Введіть текст коментаря");
      return;
    }

    if (!userId) {
      setMessage("Немає userId у localStorage");
      return;
    }

    try {
      await api.post(`/tasks/${taskId}/comments`, {
        authorUserId: userId,
        content: text
      });

      setCommentTexts((prev) => ({
        ...prev,
        [taskId]: ""
      }));

      setMessage("Коментар додано");
      loadTasks();
    } catch (error) {
      setMessage(error.response?.data?.message || "Не вдалося додати коментар");
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

        <button type="submit">Create task</button>
      </form>

      {message && <p>{message}</p>}

      {tasks.length === 0 ? (
        <p>Задач поки немає.</p>
      ) : (
        <ul>
          {tasks.map((task) => (
            <li key={task.id} style={{ marginBottom: "20px" }}>
              <div>
                <strong>{task.title}</strong> — {task.status} / {task.priority}
              </div>

              <div style={{ marginTop: "8px" }}>
                <button onClick={() => handleChangeStatus(task)}>
                  Change status
                </button>

                <button
                  onClick={() => handleDelete(task.id)}
                  style={{ marginLeft: "10px" }}
                >
                  Delete
                </button>
              </div>

              <div style={{ marginTop: "10px" }}>
                <input
                  type="text"
                  placeholder="New comment"
                  value={commentTexts[task.id] || ""}
                  onChange={(e) => handleCommentChange(task.id, e.target.value)}
                  style={{ marginRight: "10px", width: "250px" }}
                />
                <button onClick={() => handleAddComment(task.id)}>
                  Add comment
                </button>
              </div>

              <div style={{ marginTop: "10px" }}>
                <strong>Comments:</strong>
                {task.comments && task.comments.length > 0 ? (
                  <ul>
                    {task.comments.map((comment) => (
                      <li key={comment.id}>{comment.content}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No comments yet.</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}