export default function RegisterPage() {
  return (
    <div>
      <h1>Register</h1>
      <form style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "300px" }}>
        <input type="text" placeholder="First name" />
        <input type="text" placeholder="Last name" />
        <input type="email" placeholder="Email" />
        <input type="password" placeholder="Password" />
        <button type="submit">Register</button>
      </form>
    </div>
  );
}