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
    <form className="login card" onSubmit={submit}>
      <h1 style={{ marginBottom: 16 }}>Reel Drafts</h1>
      <input
        type="password"
        autoComplete="current-password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoFocus
      />
      {error && <p className="banner error" style={{ marginTop: 12 }}>{error}</p>}
      <div className="row end" style={{ marginTop: 14 }}>
        <button className="primary" disabled={busy || !password}>
          {busy ? "Checking…" : "Open"}
        </button>
      </div>
    </form>
  );
}
