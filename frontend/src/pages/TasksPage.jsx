import { useEffect, useState } from "react";
import api from "../services/api";

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [message, setMessage] = useState("");
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

  const loadProjects = async () => {
    try {
      const response = await api.get("/projects");
      setProjects(response.data);
    } catch (error) {
      setMessage(error.response?.data?.message || "Не вдалося завантажити проєкти");
    }
  };

  const loadTeams = async () => {
    try {
      const response = await api.get("/teams");
      setTeams(response.data);
    } catch (error) {
      setMessage(error.response?.data?.message || "Не вдалося завантажити команди");
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
      setMessage("Оберіть проєкт");
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

      setMessage("Задачу створено");

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
        teamId: task.team?.id || null,
        assigneeUserId: task.assignee?.id || null,
        dueDate: task.dueDate || null
      });

      setMessage("Статус задачі оновлено");
      loadTasks();
    } catch (error) {
      setMessage(error.response?.data?.message || "Не вдалося оновити статус");
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

      setMessage("Задачу оновлено");
      setEditingTaskId(null);
      loadTasks();
    } catch (error) {
      setMessage(error.response?.data?.message || "Не вдалося оновити задачу");
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
          maxWidth: "450px",
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

        <select name="teamId" value={form.teamId} onChange={handleChange}>
          <option value="">Select team</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          name="assigneeUserId"
          placeholder="Assignee user id (optional)"
          value={form.assigneeUserId}
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
            <li key={task.id} style={{ marginBottom: "24px" }}>
              {editingTaskId === task.id ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "450px" }}>
                  <input
                    type="text"
                    name="title"
                    value={editForm.title}
                    onChange={handleEditChange}
                  />

                  <input
                    type="text"
                    name="description"
                    value={editForm.description}
                    onChange={handleEditChange}
                  />

                  <select name="status" value={editForm.status} onChange={handleEditChange}>
                    <option value="ToDo">ToDo</option>
                    <option value="InProgress">InProgress</option>
                    <option value="Done">Done</option>
                  </select>

                  <select name="priority" value={editForm.priority} onChange={handleEditChange}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>

                  <select name="teamId" value={editForm.teamId} onChange={handleEditChange}>
                    <option value="">Select team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    name="assigneeUserId"
                    placeholder="Assignee user id"
                    value={editForm.assigneeUserId}
                    onChange={handleEditChange}
                  />

                  <div>
                    <button onClick={() => handleUpdateTask(task.id)}>Save</button>
                    <button onClick={cancelEditTask} style={{ marginLeft: "10px" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <strong>{task.title}</strong> — {task.status} / {task.priority}
                  </div>

                  <div>Project: {task.project?.title || "—"}</div>
                  <div>Team: {task.team?.name || "—"}</div>
                  <div>Assignee: {task.assignee?.fullName || task.assignee?.email || "—"}</div>

                  <div style={{ marginTop: "8px" }}>
                    <button onClick={() => handleChangeStatus(task)}>
                      Change status
                    </button>

                    <button
                      onClick={() => startEditTask(task)}
                      style={{ marginLeft: "10px" }}
                    >
                      Edit
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
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}