"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useDrafts } from "./drafts-context";
import { Icon, RouteChip, Spinner, StatusMark, timeAgo } from "./components";

const GROUPS = [
  { key: "refining", title: "Refining", match: (d) => d.status === "refining" || d.status === "error" },
  { key: "refined", title: "Ready to Film", match: (d) => d.status === "refined" },
  { key: "idea", title: "Ideas", match: (d) => d.status === "idea" },
];

export default function DraftList({ activeSlug }) {
  const { drafts, error, setComposeOpen } = useDrafts();
  const [view, setView] = useState("drafts");
  const [condensed, setCondensed] = useState(false);
  const titleRef = useRef(null);
  const scrollRef = useRef(null);

  // Large title collapses into the bar once it scrolls away, like iOS.
  useEffect(() => {
    const el = titleRef.current;
    const root = scrollRef.current?.closest(".pane") || null;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setCondensed(!entry.isIntersecting), {
      root,
      threshold: 0,
      rootMargin: "-44px 0px 0px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const active = (drafts || []).filter((d) => d.status !== "archived");
  const archived = (drafts || []).filter((d) => d.status === "archived");
  const count = view === "drafts" ? active.length : archived.length;

  return (
    <div ref={scrollRef} className="list-screen">
      <header className={`nav-bar${condensed ? " condensed" : ""}`}>
        <span className="nav-inline-title" aria-hidden={!condensed}>Drafts</span>
      </header>

      <h1 ref={titleRef} className="large-title">Drafts</h1>

      <div className="segmented" role="tablist" aria-label="Show">
        <button role="tab" aria-selected={view === "drafts"} onClick={() => setView("drafts")}>Drafts</button>
        <button role="tab" aria-selected={view === "archived"} onClick={() => setView("archived")}>Archived</button>
      </div>

      {error && <p className="list-error" role="alert">{error}</p>}

      {drafts === null ? (
        <div className="list-loading"><Spinner size={22} /></div>
      ) : view === "drafts" ? (
        active.length === 0 ? (
          <div className="list-empty">
            <p className="empty-title">No drafts yet</p>
            <p className="empty-text">Tap the compose button to save your first idea.</p>
          </div>
        ) : (
          GROUPS.map((g) => {
            const rows = active.filter(g.match);
            if (!rows.length) return null;
            return (
              <section key={g.key} className="group">
                <h2 className="group-header">{g.title}</h2>
                <ul className="inset-list">
                  {rows.map((d) => (
                    <DraftRow key={d.slug} draft={d} active={d.slug === activeSlug} />
                  ))}
                </ul>
              </section>
            );
          })
        )
      ) : archived.length === 0 ? (
        <div className="list-empty">
          <p className="empty-text">Archived drafts show up here.</p>
        </div>
      ) : (
        <section className="group">
          <ul className="inset-list">
            {archived.map((d) => (
              <DraftRow key={d.slug} draft={d} active={d.slug === activeSlug} />
            ))}
          </ul>
        </section>
      )}

      <footer className="toolbar">
        <button type="button" className="text-button" onClick={logout}>Log Out</button>
        <span className="toolbar-status">
          {drafts === null ? "" : `${count} ${count === 1 ? "Draft" : "Drafts"}`}
        </span>
        <button
          type="button"
          className="icon-button"
          onClick={() => setComposeOpen(true)}
          aria-label="New idea"
        >
          <Icon.Compose size={24} />
        </button>
      </footer>
    </div>
  );
}

function DraftRow({ draft, active }) {
  const secondLine =
    draft.status === "refining"
      ? "Claude is refining this"
      : draft.status === "error"
        ? "Refine didn't finish"
        : draft.preview || "No text yet";
  return (
    <li>
      <Link href={`/d/${draft.slug}`} className={`row${active ? " selected" : ""}`} aria-current={active ? "page" : undefined}>
        <span className="row-main">
          <span className="row-title">{draft.title}</span>
          <span className="row-sub">
            <span className="row-time">{timeAgo(draft.updated)}</span>
            <span className="row-preview">{secondLine}</span>
          </span>
        </span>
        <span className="row-trailing">
          {draft.status === "refined" ? <RouteChip seconds={draft.seconds} /> : <StatusMark status={draft.status} />}
        </span>
      </Link>
    </li>
  );
}
