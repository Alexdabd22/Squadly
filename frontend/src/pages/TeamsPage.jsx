import { useEffect, useState } from "react";
import api from "../services/api";

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [projects, setProjects] = useState([]);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const [teamForm, setTeamForm] = useState({
    name: "",
    description: "",
    projectId: "",
    teamLeadUserId: ""
  });

  const [memberForms, setMemberForms] = useState({});

  useEffect(() => {
    loadProjects();
    loadTeams();
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

  const handleTeamChange = (e) => {
    setTeamForm({
      ...teamForm,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!teamForm.projectId) {
      showMessage("Оберіть проєкт", true);
      return;
    }

    try {
      await api.post("/teams", {
        name: teamForm.name,
        description: teamForm.description,
        projectId: teamForm.projectId,
        teamLeadUserId: teamForm.teamLeadUserId || null
      });

      showMessage("Команду створено");

      setTeamForm({
        name: "",
        description: "",
        projectId: "",
        teamLeadUserId: ""
      });

      loadTeams();
    } catch (error) {
      showMessage(error.response?.data?.message || "Не вдалося створити команду", true);
    }
  };

  const handleMemberInputChange = (teamId, field, value) => {
    setMemberForms((prev) => ({
      ...prev,
      [teamId]: {
        ...prev[teamId],
        [field]: value
      }
    }));
  };

  const handleAddMember = async (teamId) => {
    setMessage("");

    const memberForm = memberForms[teamId] || {};
    if (!memberForm.userId) {
      showMessage("Введіть User ID", true);
      return;
    }

    try {
      await api.post(`/teams/${teamId}/members`, {
        userId: memberForm.userId,
        role: memberForm.role || "Member"
      });

      showMessage("Учасника додано");

      setMemberForms((prev) => ({
        ...prev,
        [teamId]: {
          userId: "",
          role: "Member"
        }
      }));

      loadTeams();
    } catch (error) {
      showMessage(error.response?.data?.message || "Не вдалося додати учасника", true);
    }
  };

  return (
    <div>
      <h1>Teams</h1>

      <div className="card">
        <h2>Create team</h2>
        <form onSubmit={handleCreateTeam} className="form form-wide">
          <label>Name</label>
          <input
            type="text"
            name="name"
            placeholder="Team name"
            value={teamForm.name}
            onChange={handleTeamChange}
          />

          <label>Description</label>
          <input
            type="text"
            name="description"
            placeholder="Team description"
            value={teamForm.description}
            onChange={handleTeamChange}
          />

          <label>Project</label>
          <select
            name="projectId"
            value={teamForm.projectId}
            onChange={handleTeamChange}
          >
            <option value="">Select project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>

          <label>Team lead user id (optional)</label>
          <input
            type="text"
            name="teamLeadUserId"
            placeholder="UUID"
            value={teamForm.teamLeadUserId}
            onChange={handleTeamChange}
          />

          <button type="submit">Create team</button>
        </form>
      </div>

      {message && (
        <div className={`message ${isError ? "error" : "success"}`}>
          {message}
        </div>
      )}

      <h2>All teams</h2>
      {teams.length === 0 ? (
        <div className="empty-state">Команд поки немає.</div>
      ) : (
        <ul className="plain-list">
          {teams.map((team) => (
            <li key={team.id}>
              <div className="card">
                <div className="card-title">{team.name}</div>
                {team.description && (
                  <div className="card-meta">{team.description}</div>
                )}

                <div className="detail-row">
                  <span className="label">Project:</span>
                  <span>{team.project?.title || "—"}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Members:</span>
                  <span>
                    <span className="badge">{team.memberships?.length || 0}</span>
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Team ID:</span>
                  <code style={{ fontSize: 12 }}>{team.id}</code>
                </div>

                <div className="comment-input-row" style={{ marginTop: 14 }}>
                  <input
                    type="text"
                    placeholder="User ID (UUID)"
                    value={memberForms[team.id]?.userId || ""}
                    onChange={(e) =>
                      handleMemberInputChange(team.id, "userId", e.target.value)
                    }
                  />
                  <input
                    type="text"
                    placeholder="Role (e.g. Member)"
                    value={memberForms[team.id]?.role || ""}
                    onChange={(e) =>
                      handleMemberInputChange(team.id, "role", e.target.value)
                    }
                    style={{ maxWidth: 140 }}
                  />
                  <button className="btn-small" onClick={() => handleAddMember(team.id)}>
                    Add member
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}