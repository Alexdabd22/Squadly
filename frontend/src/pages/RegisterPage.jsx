import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: ""
  });

  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

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
      const response = await api.post("/auth/register", form);

      localStorage.setItem("token", response.data.accessToken);
      localStorage.setItem("userId", response.data.user.id);

      window.dispatchEvent(new Event("authChanged"));

      setMessage("Реєстрація успішна");
      setIsError(false);

      setTimeout(() => {
        navigate("/projects");
      }, 500);
    } catch (error) {
      setMessage(error.response?.data?.message || "Помилка реєстрації");
      setIsError(true);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="card">
        <h1>Register</h1>

        <form onSubmit={handleSubmit} className="form">
          <label>First name</label>
          <input
            type="text"
            name="firstName"
            placeholder="Oleg"
            value={form.firstName}
            onChange={handleChange}
          />

          <label>Last name</label>
          <input
            type="text"
            name="lastName"
            placeholder=" Petrenko"
            value={form.lastName}
            onChange={handleChange}
          />

          <label>Email</label>
          <input
            type="email"
            name="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
          />

          <label>Password</label>
          <input
            type="password"
            name="password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
          />

          <button type="submit">Register</button>
        </form>

        {message && (
          <div className={`message ${isError ? "error" : "success"}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}