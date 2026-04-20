export default function LoginPage() {
  return (
    <div>
      <h1>Login</h1>
      <form style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "300px" }}>
        <input type="email" placeholder="Email" />
        <input type="password" placeholder="Password" />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}