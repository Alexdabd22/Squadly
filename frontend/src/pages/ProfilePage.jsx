import { useEffect, useState } from "react";
import api from "../services/api";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: ""
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const showMessage = (text, error = false) => {
    setMessage(text);
    setIsError(error);
  };

  const loadProfile = async () => {
    setLoading(true);
    try {
      const response = await api.get("/users/me");
      setUser(response.data);
      setForm({
        firstName: response.data.firstName,
        lastName: response.data.lastName
      });
    } catch (error) {
      showMessage(error.response?.data?.message || "Не вдалося завантажити профіль", true);
    } finally {
      setLoading(false);
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
      const response = await api.put("/users/me", form);
      setUser(response.data);
      setEditing(false);
      showMessage("Профіль оновлено");
    } catch (error) {
      showMessage(error.response?.data?.message || "Не вдалося оновити профіль", true);
    }
  };

  if (loading) {
    return (
      <div>
        <h1>Profile</h1>
        <div className="empty-state">Завантаження...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        <h1>Profile</h1>
        <div className="empty-state">Профіль не знайдено</div>
      </div>
    );
  }

  return (
    <div>
      <h1>Profile</h1>

      <div className="card">
        {editing ? (
          <>
            <h2>Edit profile</h2>
            <form onSubmit={handleSubmit} className="form">
              <label>First name</label>
              <input
                type="text"
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                required
              />

              <label>Last name</label>
              <input
                type="text"
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                required
              />

              <div className="btn-group">
                <button type="submit">Save</button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setEditing(false);
                    setForm({
                      firstName: user.firstName,
                      lastName: user.lastName
                    });
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <h2>Your information</h2>
            <div className="detail-row">
              <span className="label">Full name:</span>
              <span>{user.fullName}</span>
            </div>
            <div className="detail-row">
              <span className="label">First name:</span>
              <span>{user.firstName}</span>
            </div>
            <div className="detail-row">
              <span className="label">Last name:</span>
              <span>{user.lastName}</span>
            </div>
            <div className="detail-row">
              <span className="label">Email:</span>
              <span>{user.email}</span>
            </div>
            <div className="detail-row">
              <span className="label">User ID:</span>
              <code style={{ fontSize: 12 }}>{user.id}</code>
            </div>

            <div style={{ marginTop: 16 }}>
              <button onClick={() => setEditing(true)}>Edit profile</button>
            </div>
          </>
        )}
      </div>

      {message && (
        <div className={`message ${isError ? "error" : "success"}`}>
          {message}
        </div>
      )}
    </div>
  );
}