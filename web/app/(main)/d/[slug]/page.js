"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AutoTextarea,
  CopyButton,
  RefiningMark,
  Icon,
  SPEAKING_RATE,
  Spinner,
  api,
  timeAgo,
} from "../../../components";
import { useDrafts } from "../../../drafts-context";
import ReadMode from "../../../read-mode";
import { wordCount } from "@/lib/draft";

const POLL_MS = 7000;
const POLL_LIMIT_MS = 10 * 60 * 1000;

export default function DraftPage() {
  const { slug } = useParams();
  const { reload, patch } = useDrafts();
  const [draft, setDraft] = useState(null); // { sha, meta, sections }
  const [dirty, setDirty] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved
  const [busy, setBusy] = useState("");
  const [problem, setProblem] = useState(null); // { text, conflict, link }
  const [reading, setReading] = useState(false);
  const [condensed, setCondensed] = useState(false);
  const live = useRef({ draft: null, dirty: false, saving: null });
  const pollStart = useRef(0);
  const titleRef = useRef(null);

  live.current.draft = draft;
  live.current.dirty = dirty;
  live.current.slug = slug;

  const load = useCallback(async () => {
    try {
      const data = await api(`/api/drafts/${slug}`);
      setDraft({ sha: data.sha, meta: data.meta, sections: data.sections });
      setDirty(false);
      return data;
    } catch (err) {
      if (err.status !== 401) setProblem({ text: err.message });
      return null;
    }
  }, [slug]);

  useEffect(() => {
    setDraft(null);
    setDirty(false);
    setSaveState("idle");
    setProblem(null);
    setReading(false);
    load();
  }, [load]);

  const save = useCallback(
    async (overrides = {}, { keepalive = false } = {}) => {
      const current = live.current.draft;
      if (!current) return;
      if (!live.current.dirty && !overrides.status) return;
      if (live.current.saving) await live.current.saving;
      const body = {
        sha: live.current.draft.sha,
        meta: { ...live.current.draft.meta, ...overrides },
        sections: live.current.draft.sections,
      };
      setSaveState("saving");
      const run = (async () => {
        try {
          const data = await api(`/api/drafts/${slug}`, {
            method: "PUT",
            body: JSON.stringify(body),
            keepalive,
          });
          patch(slug, { title: data.meta.title, status: data.meta.status, updated: data.meta.updated });
          // The user may have opened another draft while this saved.
          if (live.current.slug !== slug) return;
          setDraft((d) => (d ? { ...d, sha: data.sha, meta: data.meta } : d));
          setDirty(false);
          live.current.dirty = false;
          setSaveState("saved");
        } catch (err) {
          if (live.current.slug !== slug) return;
          setSaveState("idle");
          setProblem({ text: err.message, conflict: err.data?.conflict });
        } finally {
          live.current.saving = null;
        }
      })();
      live.current.saving = run;
      return run;
    },
    [slug, patch]
  );

  // Save when the app goes to the background or the draft closes.
  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && save({}, { keepalive: true });
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      save({}, { keepalive: true });
    };
  }, [save]);

  const status = draft?.meta?.status || "idea";
  const refining = status === "refining";

  // Poll while Claude is working.
  useEffect(() => {
    if (!refining) return;
    if (!pollStart.current) pollStart.current = Date.now();
    const t = setInterval(async () => {
      if (Date.now() - pollStart.current > POLL_LIMIT_MS) {
        clearInterval(t);
        setProblem({ text: "This is taking longer than usual. Check the run on GitHub, then reload." });
        return;
      }
      const data = await load();
      if (data && data.meta.status !== "refining") {
        pollStart.current = 0;
        reload();
      }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [refining, load, reload]);

  // Inline title in the bar once the big title scrolls away.
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setCondensed(!e.isIntersecting), {
      root: el.closest(".pane"),
      rootMargin: "-44px 0px 0px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [draft !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  function setSection(name, value) {
    setDraft((d) => ({ ...d, sections: { ...d.sections, [name]: value } }));
    setDirty(true);
    setSaveState("idle");
  }

  function setTitle(value) {
    setDraft((d) => ({ ...d, meta: { ...d.meta, title: value } }));
    setDirty(true);
    setSaveState("idle");
  }

  async function done() {
    document.activeElement?.blur?.();
    setEditing(false);
    await save();
  }

  async function toggleArchive() {
    await save({ status: status === "archived" ? "idea" : "archived" });
  }

  async function refine() {
    setBusy("refine");
    setProblem(null);
    try {
      if (live.current.saving) await live.current.saving;
      const data = await api(`/api/drafts/${slug}/refine`, {
        method: "POST",
        body: JSON.stringify({ sha: draft.sha, meta: draft.meta, sections: draft.sections }),
      });
      pollStart.current = Date.now();
      setDraft((d) => ({ ...d, sha: data.sha, meta: data.meta }));
      setDirty(false);
      patch(slug, { status: "refining", updated: data.meta.updated });
    } catch (err) {
      if (err.data?.sha) setDraft((d) => ({ ...d, sha: err.data.sha, meta: err.data.meta || d.meta }));
      setProblem({ text: err.message, conflict: err.data?.conflict });
    } finally {
      setBusy("");
    }
  }

  const backLink = (
    <Link href="/" className="nav-back" aria-label="Back to drafts">
      <Icon.Back size={22} />
      <span>Drafts</span>
    </Link>
  );

  if (!draft) {
    return (
      <div className="detail-screen">
        <header className="nav-bar">{backLink}</header>
        {problem ? (
          <p className="inline-error padded" role="alert">{problem.text}</p>
        ) : (
          <div className="list-loading"><Spinner size={22} /></div>
        )}
      </div>
    );
  }

  const s = draft.sections;
  const words = wordCount(s.Script);
  const seconds = words ? Math.round(words / SPEAKING_RATE) : 0;
  const hasOutput = Boolean(s.Script || s.Caption || s["On-screen text"]);
  const showDone = editing || dirty;

  const statusText =
    saveState === "saving"
      ? "Saving…"
      : refining
        ? "Refining…"
        : dirty
          ? "Edited"
          : status === "refined"
            ? `Refined ${relative(draft.meta.updated)}`
            : `Edited ${relative(draft.meta.updated)}`;

  return (
    <div
      className="detail-screen"
      onFocusCapture={(e) => e.target.matches?.("textarea, input") && setEditing(true)}
      onBlurCapture={(e) => e.target.matches?.("textarea, input") && setEditing(false)}
    >
      <header className={`nav-bar${condensed ? " condensed" : ""}`}>
        {backLink}
        <span className="nav-inline-title" aria-hidden={!condensed}>{draft.meta.title}</span>
        <span className="nav-trailing">
          {showDone ? (
            <button type="button" className="text-button strong" onMouseDown={(e) => e.preventDefault()} onClick={done}>
              Done
            </button>
          ) : s.Script ? (
            <button type="button" className="text-button" onClick={() => setReading(true)}>
              <Icon.Read size={20} /> Read
            </button>
          ) : null}
        </span>
      </header>

      <div className="detail-body">
        <AutoTextarea
          ref={titleRef}
          className="title-field"
          value={draft.meta.title || ""}
          onChange={(v) => setTitle(v.replace(/\n/g, " "))}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), e.currentTarget.blur())}
          minRows={1}
          readOnly={refining}
          aria-label="Title"
          enterKeyHint="done"
        />

        {refining && (
          <div className="callout">
            <RefiningMark size={20} />
            <div>
              <p className="callout-title">Claude is refining this</p>
              <p className="callout-text">It usually takes a minute or two. This page updates by itself.</p>
            </div>
          </div>
        )}
        {status === "error" && (
          <div className="callout error">
            <Icon.Alert size={20} />
            <div>
              <p className="callout-title">The last refine didn't finish</p>
              <p className="callout-text">Open the Refine draft run in your repo's Actions tab to see why, then try again.</p>
            </div>
          </div>
        )}
        {problem && (
          <div className="callout error" role="alert">
            <Icon.Alert size={20} />
            <div>
              <p className="callout-text">{problem.text}</p>
            </div>
            {problem.conflict && (
              <button type="button" className="text-button" onClick={() => { setProblem(null); load(); }}>
                Reload
              </button>
            )}
          </div>
        )}

        <Group title="Your Idea">
          <AutoTextarea
            value={s.Idea}
            onChange={(v) => setSection("Idea", v)}
            minRows={3}
            readOnly={refining}
            placeholder="The rough idea, in your words."
          />
        </Group>

        <Group title="Direction" footer="Optional. Length, angle, series part, or what to change next time.">
          <AutoTextarea
            value={s.Direction}
            onChange={(v) => setSection("Direction", v)}
            minRows={1}
            readOnly={refining}
            placeholder="Anything Claude should know"
          />
        </Group>

        {hasOutput && (
          <>
            <Group
              title="Script"
              action={
                <span className="group-actions">
                  <button type="button" className="text-button" onClick={() => setReading(true)} disabled={!s.Script}>
                    <Icon.Read size={16} /> Read
                  </button>
                  <CopyButton text={s.Script} />
                </span>
              }
              footer={
                words
                  ? `${words} words, about ${seconds} seconds out loud. Claude wrote it. Edit anything.`
                  : "Claude wrote this. Edit anything."
              }
            >
              <AutoTextarea
                className="script-field"
                value={s.Script}
                onChange={(v) => setSection("Script", v)}
                minRows={5}
                readOnly={refining}
              />
            </Group>

            <Group title="On-Screen Text" action={<CopyButton text={s["On-screen text"]} />}>
              <AutoTextarea
                value={s["On-screen text"]}
                onChange={(v) => setSection("On-screen text", v)}
                minRows={2}
                readOnly={refining}
              />
            </Group>

            <Group title="Caption" action={<CopyButton text={s.Caption} />}>
              <AutoTextarea
                value={s.Caption}
                onChange={(v) => setSection("Caption", v)}
                minRows={3}
                readOnly={refining}
              />
            </Group>

            {s["Claude's notes"] && (
              <Group title="Claude's Notes">
                <div className="notes">{s["Claude's notes"]}</div>
              </Group>
            )}
          </>
        )}
      </div>

      <footer className="toolbar">
        <button
          type="button"
          className="icon-button"
          onClick={toggleArchive}
          disabled={!!busy || refining}
          aria-label={status === "archived" ? "Move back to drafts" : "Archive"}
          title={status === "archived" ? "Move back to drafts" : "Archive"}
        >
          {status === "archived" ? <Icon.Restore size={22} /> : <Icon.Archive size={22} />}
        </button>
        <span className="toolbar-status" aria-live="polite">{statusText}</span>
        <button
          type="button"
          className="prominent-button"
          onClick={refine}
          disabled={!!busy || refining || !s.Idea.trim()}
        >
          {busy === "refine" ? <Spinner size={16} /> : null}
          {hasOutput ? "Refine Again" : "Refine"}
        </button>
      </footer>

      {reading && (
        <ReadMode title={draft.meta.title} script={s.Script} seconds={seconds} onClose={() => setReading(false)} />
      )}
    </div>
  );
}

// "Just now" and "Yesterday" read mid-sentence in lower case; day names and dates keep capitals.
function relative(iso) {
  const t = timeAgo(iso);
  return /^(Just now|Yesterday)$/.test(t) ? t.toLowerCase() : t;
}

function Group({ title, action, footer, children }) {
  return (
    <section className="group">
      <div className="group-head">
        <h2 className="group-header">{title}</h2>
        {action}
      </div>
      <div className="inset-card">{children}</div>
      {footer && <p className="group-footer">{footer}</p>}
    </section>
  );
}
