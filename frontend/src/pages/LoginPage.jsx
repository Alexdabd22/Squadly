import { useState } from "react";
import api from "../services/api";

export default function LoginPage() {
  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    console.log("login submit", form);

    try {
      const response = await api.post("/auth/login", form);
      localStorage.setItem("token", response.data.accessToken);
      setMessage("Вхід успішний");
      console.log("login ok", response.data);
    } catch (error) {
      console.log("login error", error);
      setMessage(error.response?.data?.message || "Помилка входу");
    }
  };

  return (
    <div>
      <h1>Login</h1>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "300px" }}
      >
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
        />

        <button type="submit">Login</button>
      </form>

      {message && <p>{message}</p>}
    </div>
  );
}