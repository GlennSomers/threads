"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AutoTextarea, CopyButton, StatusPill, api, timeAgo } from "../../components";
import { wordCount } from "@/lib/draft";

const POLL_MS = 7000;
const POLL_LIMIT_MS = 10 * 60 * 1000;

export default function DraftPage() {
  const { slug } = useParams();
  const [draft, setDraft] = useState(null); // { sha, meta, sections }
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState(null);
  const [actionsUrl, setActionsUrl] = useState("");
  const pollStart = useRef(0);

  const load = useCallback(async () => {
    try {
      const data = await api(`/api/drafts/${slug}`);
      setDraft({ sha: data.sha, meta: data.meta, sections: data.sections });
      setDirty(false);
      return data;
    } catch (err) {
      if (err.status !== 401) setMessage({ kind: "error", text: err.message });
      return null;
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const status = draft?.meta?.status || "idea";
  const refining = status === "refining";

  // Poll while Claude is working.
  useEffect(() => {
    if (!refining) return;
    if (!pollStart.current) pollStart.current = Date.now();
    const t = setInterval(async () => {
      if (Date.now() - pollStart.current > POLL_LIMIT_MS) {
        clearInterval(t);
        setMessage({
          kind: "error",
          text: "This is taking longer than usual. Check the run on GitHub, then reload.",
        });
        return;
      }
      const data = await load();
      if (data && data.meta.status !== "refining") {
        pollStart.current = 0;
        if (data.meta.status === "refined") setMessage({ kind: "ok", text: "Refined. Have a read." });
      }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [refining, load]);

  function setSection(name, value) {
    setDraft((d) => ({ ...d, sections: { ...d.sections, [name]: value } }));
    setDirty(true);
  }

  function setTitle(value) {
    setDraft((d) => ({ ...d, meta: { ...d.meta, title: value } }));
    setDirty(true);
  }

  function handleError(err) {
    if (err.data?.sha) {
      setDraft((d) => ({ ...d, sha: err.data.sha, meta: err.data.meta || d.meta }));
    }
    setMessage({ kind: "error", text: err.message, conflict: err.data?.conflict });
  }

  async function save(nextStatus) {
    setBusy("save");
    setMessage(null);
    try {
      const meta = { ...draft.meta, ...(nextStatus ? { status: nextStatus } : {}) };
      const data = await api(`/api/drafts/${slug}`, {
        method: "PUT",
        body: JSON.stringify({ sha: draft.sha, meta, sections: draft.sections }),
      });
      setDraft((d) => ({ ...d, sha: data.sha, meta: data.meta }));
      setDirty(false);
      setMessage({ kind: "ok", text: nextStatus === "archived" ? "Archived." : "Saved." });
    } catch (err) {
      handleError(err);
    } finally {
      setBusy("");
    }
  }

  async function refine() {
    setBusy("refine");
    setMessage(null);
    try {
      const data = await api(`/api/drafts/${slug}/refine`, {
        method: "POST",
        body: JSON.stringify({ sha: draft.sha, meta: draft.meta, sections: draft.sections }),
      });
      pollStart.current = Date.now();
      setDraft((d) => ({ ...d, sha: data.sha, meta: data.meta }));
      setDirty(false);
      setActionsUrl(data.actionsUrl || "");
    } catch (err) {
      handleError(err);
    } finally {
      setBusy("");
    }
  }

  if (!draft) {
    return (
      <>
        <div className="topbar"><Link className="back" href="/">← Drafts</Link></div>
        {message ? <div className={`banner ${message.kind}`}>{message.text}</div> : <p className="empty"><span className="spinner" /> Loading…</p>}
      </>
    );
  }

  const s = draft.sections;
  const words = wordCount(s.Script);
  const seconds = Math.round(words / 2.75);
  const hasOutput = Boolean(s.Script || s.Caption || s["On-screen text"]);

  return (
    <>
      <div className="topbar">
        <Link className="back" href="/">← Drafts</Link>
        <StatusPill status={status} />
      </div>

      <div className="card">
        <input
          type="text"
          className="title-input"
          value={draft.meta.title || ""}
          onChange={(e) => setTitle(e.target.value)}
          readOnly={refining}
          aria-label="Title"
        />
        <p className="muted small-text" style={{ margin: "4px 0 0" }}>
          Updated {timeAgo(draft.meta.updated)}
        </p>
      </div>

      {refining && (
        <div className="banner info">
          <span className="spinner" /> Claude is refining this. It usually takes a minute or two, and
          this page updates by itself.{" "}
          {actionsUrl && <a href={actionsUrl} target="_blank" rel="noreferrer">Watch the run</a>}
        </div>
      )}
      {status === "error" && !message && (
        <div className="banner error">
          The last refine didn't finish. Check the run in your repo's Actions tab, then try again.
        </div>
      )}
      {message && (
        <div className={`banner ${message.kind}`}>
          {message.text}{" "}
          {message.conflict && (
            <button className="small" onClick={() => { setMessage(null); load(); }}>Reload</button>
          )}
        </div>
      )}

      <section className="card">
        <h2>Idea</h2>
        <AutoTextarea
          value={s.Idea}
          onChange={(v) => setSection("Idea", v)}
          minRows={4}
          readOnly={refining}
          placeholder="The rough idea, in your words."
        />
        <h2 style={{ marginTop: 14 }}>Direction</h2>
        <AutoTextarea
          value={s.Direction}
          onChange={(v) => setSection("Direction", v)}
          minRows={2}
          readOnly={refining}
          placeholder="Optional: length, angle, which part of a series, what to change next time."
        />
      </section>

      {hasOutput && (
        <>
          <section className="card">
            <div className="spread" style={{ marginBottom: 8 }}>
              <h2 style={{ margin: 0 }}>Script</h2>
              <CopyButton text={s.Script} />
            </div>
            <AutoTextarea
              className="script"
              value={s.Script}
              onChange={(v) => setSection("Script", v)}
              minRows={6}
              readOnly={refining}
            />
            <p className="muted small-text" style={{ margin: "8px 0 0" }}>
              {words} words, about {seconds}s spoken
            </p>
          </section>

          <section className="card">
            <div className="spread" style={{ marginBottom: 8 }}>
              <h2 style={{ margin: 0 }}>On-screen text</h2>
              <CopyButton text={s["On-screen text"]} />
            </div>
            <AutoTextarea
              value={s["On-screen text"]}
              onChange={(v) => setSection("On-screen text", v)}
              minRows={3}
              readOnly={refining}
            />
          </section>

          <section className="card">
            <div className="spread" style={{ marginBottom: 8 }}>
              <h2 style={{ margin: 0 }}>Caption</h2>
              <CopyButton text={s.Caption} />
            </div>
            <AutoTextarea
              value={s.Caption}
              onChange={(v) => setSection("Caption", v)}
              minRows={4}
              readOnly={refining}
            />
          </section>

          {s["Claude's notes"] && (
            <section className="card">
              <h2>Claude's notes</h2>
              <div className="notes">{s["Claude's notes"]}</div>
            </section>
          )}
        </>
      )}

      <div className="sticky-actions">
        <div className="row end">
          {status === "archived" ? (
            <button onClick={() => save("idea")} disabled={!!busy}>Unarchive</button>
          ) : (
            <button onClick={() => save("archived")} disabled={!!busy || refining}>Archive</button>
          )}
          <button onClick={() => save()} disabled={!!busy || refining || !dirty}>
            {busy === "save" ? <span className="spinner" /> : null} Save
          </button>
          <button className="primary" onClick={refine} disabled={!!busy || refining || !s.Idea.trim()}>
            {busy === "refine" ? <span className="spinner" /> : null}
            {hasOutput ? "Refine again" : "Refine with Claude"}
          </button>
        </div>
      </div>
    </>
  );
}
