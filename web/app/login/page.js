"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Couldn't log in.");
      return;
    }
    window.location.href = "/";
  }

  return (
    <main className="login">
      <form className="login-card" onSubmit={submit}>
        <h1 className="login-sign">Reel Drafts</h1>
        <input
          className="login-field"
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-label="Password"
          autoFocus
        />
        {error && <p className="inline-error" role="alert">{error}</p>}
        <button className="prominent-button" disabled={busy || !password}>
          {busy ? "Checking…" : "Open"}
        </button>
      </form>
    </main>
  );
}
