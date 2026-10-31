"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AutoTextarea, StatusPill, api, timeAgo } from "./components";

export default function InboxPage() {
  const [drafts, setDrafts] = useState(null);
  const [idea, setIdea] = useState("");
  const [direction, setDirection] = useState("");
  const [showDirection, setShowDirection] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [tab, setTab] = useState("active");

  const load = useCallback(async () => {
    try {
      const data = await api("/api/drafts");
      setDrafts(data.drafts);
    } catch (err) {
      if (err.status !== 401) setMessage({ kind: "error", text: err.message });
      setDrafts([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Keep the list fresh while something is refining.
  useEffect(() => {
    if (!drafts?.some((d) => d.status === "refining")) return;
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [drafts, load]);

  async function save(e) {
    e.preventDefault();
    if (!idea.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const { slug } = await api("/api/drafts", {
        method: "POST",
        body: JSON.stringify({ idea, direction }),
      });
      setIdea("");
      setDirection("");
      setShowDirection(false);
      setMessage({ kind: "ok", text: "Saved.", slug });
      load();
    } catch (err) {
      setMessage({ kind: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const shown = (drafts || []).filter((d) =>
    tab === "archived" ? d.status === "archived" : d.status !== "archived"
  );

  return (
    <>
      <div className="topbar">
        <h1>Reel Drafts</h1>
        <button className="small" onClick={logout}>Log out</button>
      </div>

      <form className="card" onSubmit={save}>
        <h2>New idea</h2>
        <AutoTextarea
          value={idea}
          onChange={setIdea}
          minRows={4}
          placeholder="Type or dictate the idea. Rambling is fine."
          aria-label="New idea"
        />
        {showDirection && (
          <AutoTextarea
            value={direction}
            onChange={setDirection}
            minRows={2}
            placeholder="Direction for Claude (optional), e.g. 30 seconds, part 4 of the wedding series"
            aria-label="Direction"
            style={{ marginTop: 10 }}
          />
        )}
        <div className="spread" style={{ marginTop: 12 }}>
          {!showDirection ? (
            <button type="button" className="small" onClick={() => setShowDirection(true)}>
              + Direction
            </button>
          ) : (
            <span />
          )}
          <button className="primary" disabled={busy || !idea.trim()}>
            {busy ? <span className="spinner" /> : null} Save idea
          </button>
        </div>
      </form>

      {message && (
        <div className={`banner ${message.kind}`}>
          {message.text}{" "}
          {message.slug && <Link href={`/d/${message.slug}`}>Open it</Link>}
        </div>
      )}

      <div className="tabs" role="group" aria-label="Filter">
        <button aria-pressed={tab === "active"} onClick={() => setTab("active")}>Drafts</button>
        <button aria-pressed={tab === "archived"} onClick={() => setTab("archived")}>Archived</button>
      </div>

      {drafts === null ? (
        <p className="empty"><span className="spinner" /> Loading…</p>
      ) : shown.length === 0 ? (
        <p className="empty">
          {tab === "archived" ? "Nothing archived." : "No drafts yet. Your first idea goes in the box above."}
        </p>
      ) : (
        <ul className="list">
          {shown.map((d) => (
            <li key={d.slug}>
              <Link href={`/d/${d.slug}`}>
                <div className="spread">
                  <span className="item-title">{d.title}</span>
                  <StatusPill status={d.status} />
                </div>
                {d.preview && <div className="preview">{d.preview}</div>}
                <div className="meta">{timeAgo(d.updated)}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
