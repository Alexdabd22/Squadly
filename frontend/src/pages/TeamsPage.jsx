import { useEffect, useState } from "react";
import api from "../services/api";

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [projects, setProjects] = useState([]);
  const [message, setMessage] = useState("");

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
      setMessage("Оберіть проєкт");
      return;
    }

    try {
      await api.post("/teams", {
        name: teamForm.name,
        description: teamForm.description,
        projectId: teamForm.projectId,
        teamLeadUserId: teamForm.teamLeadUserId || null
      });

      setMessage("Команду створено");

      setTeamForm({
        name: "",
        description: "",
        projectId: "",
        teamLeadUserId: ""
      });

      loadTeams();
    } catch (error) {
      setMessage(error.response?.data?.message || "Не вдалося створити команду");
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
      setMessage("Введіть User ID");
      return;
    }

    try {
      await api.post(`/teams/${teamId}/members`, {
        userId: memberForm.userId,
        role: memberForm.role || "Member"
      });

      setMessage("Учасника додано");

      setMemberForms((prev) => ({
        ...prev,
        [teamId]: {
          userId: "",
          role: "Member"
        }
      }));

      loadTeams();
    } catch (error) {
      setMessage(error.response?.data?.message || "Не вдалося додати учасника");
    }
  };

  return (
    <div>
      <h1>Teams</h1>

      <form
        onSubmit={handleCreateTeam}
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
          name="name"
          placeholder="Team name"
          value={teamForm.name}
          onChange={handleTeamChange}
        />

        <input
          type="text"
          name="description"
          placeholder="Team description"
          value={teamForm.description}
          onChange={handleTeamChange}
        />

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

        <input
          type="text"
          name="teamLeadUserId"
          placeholder="Team lead user id (optional)"
          value={teamForm.teamLeadUserId}
          onChange={handleTeamChange}
        />

        <button type="submit">Create team</button>
      </form>

      {message && <p>{message}</p>}

      {teams.length === 0 ? (
        <p>Команд поки немає.</p>
      ) : (
        <ul>
          {teams.map((team) => (
            <li key={team.id} style={{ marginBottom: "20px" }}>
              <div>
                <strong>{team.name}</strong>
                {team.description && <span> — {team.description}</span>}
              </div>

              <div style={{ marginTop: "6px" }}>
                Project: {team.project?.title || "—"}
              </div>

              <div style={{ marginTop: "6px" }}>
                Members: {team.memberships?.length || 0}
              </div>

              <div style={{ marginTop: "10px" }}>
                <input
                  type="text"
                  placeholder="User ID"
                  value={memberForms[team.id]?.userId || ""}
                  onChange={(e) =>
                    handleMemberInputChange(team.id, "userId", e.target.value)
                  }
                  style={{ marginRight: "10px" }}
                />

                <input
                  type="text"
                  placeholder="Role"
                  value={memberForms[team.id]?.role || ""}
                  onChange={(e) =>
                    handleMemberInputChange(team.id, "role", e.target.value)
                  }
                  style={{ marginRight: "10px" }}
                />

                <button onClick={() => handleAddMember(team.id)}>
                  Add member
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}