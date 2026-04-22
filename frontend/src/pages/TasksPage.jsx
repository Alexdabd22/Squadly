import { useEffect, useState } from "react";
import api from "../services/api";

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [commentTexts, setCommentTexts] = useState({});
  const [editingTaskId, setEditingTaskId] = useState(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "ToDo",
    priority: "Medium",
    projectId: "",
    teamId: "",
    assigneeUserId: ""
  });

  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    status: "ToDo",
    priority: "Medium",
    teamId: "",
    assigneeUserId: ""
  });

  useEffect(() => {
    loadProjects();
    loadTeams();
    loadTasks();
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

  const loadTeams = async () => {
    try {
      const response = await api.get("/teams");
      setTeams(response.data);
    } catch (error) {
      showMessage(error.response?.data?.message || "Не вдалося завантажити команди", true);
    }
  };

  const loadTasks = async () => {
    try {
      const response = await api.get("/tasks");
      setTasks(response.data);
    } catch (error) {
      showMessage(error.response?.data?.message || "Не вдалося завантажити задачі", true);
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

    if (!form.projectId) {
      showMessage("Оберіть проєкт", true);
      return;
    }

    try {
      await api.post("/tasks", {
        title: form.title,
        description: form.description,
        status: form.status,
        priority: form.priority,
        projectId: form.projectId,
        teamId: form.teamId || null,
        assigneeUserId: form.assigneeUserId || null
      });

      showMessage("Задачу створено");

      setForm({
        title: "",
        description: "",
        status: "ToDo",
        priority: "Medium",
        projectId: "",
        teamId: "",
        assigneeUserId: ""
      });

      loadTasks();
    } catch (error) {
      showMessage(error.response?.data?.message || "Не вдалося створити задачу", true);
    }
  };

  const handleDelete = async (id) => {
    setMessage("");
    try {
      await api.delete(`/tasks/${id}`);
      showMessage("Задачу видалено");
      loadTasks();
    } catch (error) {
      showMessage(error.response?.data?.message || "Не вдалося видалити задачу", true);
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
        teamId: task.team?.id || null,
        assigneeUserId: task.assignee?.id || null,
        dueDate: task.dueDate || null
      });

      showMessage("Статус задачі оновлено");
      loadTasks();
    } catch (error) {
      showMessage(error.response?.data?.message || "Не вдалося оновити статус", true);
    }
  };

  const startEditTask = (task) => {
    setEditingTaskId(task.id);
    setEditForm({
      title: task.title || "",
      description: task.description || "",
      status: task.status || "ToDo",
      priority: task.priority || "Medium",
      teamId: task.team?.id || "",
      assigneeUserId: task.assignee?.id || ""
    });
  };

  const cancelEditTask = () => {
    setEditingTaskId(null);
    setEditForm({
      title: "",
      description: "",
      status: "ToDo",
      priority: "Medium",
      teamId: "",
      assigneeUserId: ""
    });
  };

  const handleUpdateTask = async (taskId) => {
    setMessage("");
    try {
      await api.put(`/tasks/${taskId}`, {
        title: editForm.title,
        description: editForm.description,
        status: editForm.status,
        priority: editForm.priority,
        teamId: editForm.teamId || null,
        assigneeUserId: editForm.assigneeUserId || null,
        dueDate: null
      });

      showMessage("Задачу оновлено");
      setEditingTaskId(null);
      loadTasks();
    } catch (error) {
      showMessage(error.response?.data?.message || "Не вдалося оновити задачу", true);
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
      showMessage("Введіть текст коментаря", true);
      return;
    }

    if (!userId) {
      showMessage("Немає userId у localStorage", true);
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

      showMessage("Коментар додано");
      loadTasks();
    } catch (error) {
      showMessage(error.response?.data?.message || "Не вдалося додати коментар", true);
    }
  };

  return (
    <div>
      <h1>Tasks</h1>

      <div className="card">
        <h2>Create task</h2>
        <form onSubmit={handleSubmit} className="form form-wide">
          <label>Title</label>
          <input
            type="text"
            name="title"
            placeholder="Task title"
            value={form.title}
            onChange={handleChange}
          />

          <label>Description</label>
          <input
            type="text"
            name="description"
            placeholder="Task description"
            value={form.description}
            onChange={handleChange}
          />

          <label>Status</label>
          <select name="status" value={form.status} onChange={handleChange}>
            <option value="ToDo">ToDo</option>
            <option value="InProgress">InProgress</option>
            <option value="Done">Done</option>
          </select>

          <label>Priority</label>
          <select name="priority" value={form.priority} onChange={handleChange}>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>

          <label>Project</label>
          <select name="projectId" value={form.projectId} onChange={handleChange}>
            <option value="">Select project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>

          <label>Team (optional)</label>
          <select name="teamId" value={form.teamId} onChange={handleChange}>
            <option value="">Select team</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>

          <label>Assignee user id (optional)</label>
          <input
            type="text"
            name="assigneeUserId"
            placeholder="UUID"
            value={form.assigneeUserId}
            onChange={handleChange}
          />

          <button type="submit">Create task</button>
        </form>
      </div>

      {message && (
        <div className={`message ${isError ? "error" : "success"}`}>
          {message}
        </div>
      )}

      <h2>All tasks</h2>
      {tasks.length === 0 ? (
        <div className="empty-state">Задач поки немає.</div>
      ) : (
        <ul className="plain-list">
          {tasks.map((task) => (
            <li key={task.id}>
              <div className="card">
                {editingTaskId === task.id ? (
                  <div className="edit-form">
                    <label>Title</label>
                    <input
                      type="text"
                      name="title"
                      className="field"
                      value={editForm.title}
                      onChange={handleEditChange}
                    />

                    <label>Description</label>
                    <input
                      type="text"
                      name="description"
                      className="field"
                      value={editForm.description}
                      onChange={handleEditChange}
                    />

                    <label>Status</label>
                    <select
                      name="status"
                      className="field"
                      value={editForm.status}
                      onChange={handleEditChange}
                    >
                      <option value="ToDo">ToDo</option>
                      <option value="InProgress">InProgress</option>
                      <option value="Done">Done</option>
                    </select>

                    <label>Priority</label>
                    <select
                      name="priority"
                      className="field"
                      value={editForm.priority}
                      onChange={handleEditChange}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>

                    <label>Team</label>
                    <select
                      name="teamId"
                      className="field"
                      value={editForm.teamId}
                      onChange={handleEditChange}
                    >
                      <option value="">Select team</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>

                    <label>Assignee user id</label>
                    <input
                      type="text"
                      name="assigneeUserId"
                      className="field"
                      placeholder="UUID"
                      value={editForm.assigneeUserId}
                      onChange={handleEditChange}
                    />

                    <div className="btn-group" style={{ marginTop: 8 }}>
                      <button onClick={() => handleUpdateTask(task.id)}>Save</button>
                      <button className="btn-secondary" onClick={cancelEditTask}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="card-title">{task.title}</div>
                    <div style={{ marginBottom: 8 }}>
                      <span className={`badge status-${task.status}`}>{task.status}</span>
                      <span className={`badge priority-${task.priority}`}>{task.priority}</span>
                    </div>

                    {task.description && (
                      <div className="card-meta">{task.description}</div>
                    )}

                    <div className="detail-row">
                      <span className="label">Project:</span>
                      <span>{task.project?.title || "—"}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Team:</span>
                      <span>{task.team?.name || "—"}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Assignee:</span>
                      <span>{task.assignee?.fullName || task.assignee?.email || "—"}</span>
                    </div>

                    <div className="btn-group" style={{ marginTop: 10 }}>
                      <button className="btn-small" onClick={() => handleChangeStatus(task)}>
                        Change status
                      </button>
                      <button className="btn-small btn-secondary" onClick={() => startEditTask(task)}>
                        Edit
                      </button>
                      <button className="btn-small btn-danger" onClick={() => handleDelete(task.id)}>
                        Delete
                      </button>
                    </div>

                    <div className="comment-input-row">
                      <input
                        type="text"
                        placeholder="New comment"
                        value={commentTexts[task.id] || ""}
                        onChange={(e) => handleCommentChange(task.id, e.target.value)}
                      />
                      <button className="btn-small" onClick={() => handleAddComment(task.id)}>
                        Add comment
                      </button>
                    </div>

                    <div className="comments-block">
                      <strong>Comments:</strong>
                      {task.comments && task.comments.length > 0 ? (
                        <ul>
                          {task.comments.map((comment) => (
                            <li key={comment.id}>{comment.content}</li>
                          ))}
                        </ul>
                      ) : (
                        <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "8px 0 0 0" }}>
                          No comments yet.
                        </p>
                      )}
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