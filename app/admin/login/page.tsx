"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [username,setUsername]=useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username,password }),
    });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) return setError(result.error);
    router.replace("/admin");
    router.refresh();
  }

  return <main className="login-shell"><form className="login-card" onSubmit={submit}>
    <div className="brand"><span>ML</span><div>Mesa Lista<small>Panel del local</small></div></div>
    <h1>Bienvenido</h1><p>Ingrese con su usuario. Para la clave principal puede dejar el usuario vacío.</p>
    <label>Usuario<input autoFocus value={username} onChange={(event)=>setUsername(event.target.value)} placeholder="Ej. cocina" autoCapitalize="none" /></label>
    <label>Contraseña<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
    {error && <div className="form-error">{error}</div>}
    <button disabled={loading}>{loading ? "Ingresando…" : "Entrar al panel"}</button>
    <Link href="/">← Volver al menú</Link>
  </form></main>;
}
