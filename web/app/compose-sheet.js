"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDrafts } from "./drafts-context";
import { AutoTextarea, Spinner, api } from "./components";

export default function ComposeSheet() {
  const { composeOpen, setComposeOpen, reload } = useDrafts();
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [direction, setDirection] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ideaRef = useRef(null);

  useEffect(() => {
    if (!composeOpen) return;
    const t = setTimeout(() => ideaRef.current?.focus(), 60);
    function onKey(e) {
      if (e.key === "Escape") close();
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composeOpen, idea, direction]);

  function close() {
    if (busy) return;
    setComposeOpen(false);
    setError("");
  }

  async function save() {
    if (!idea.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const { slug } = await api("/api/drafts", {
        method: "POST",
        body: JSON.stringify({ idea, direction }),
      });
      setIdea("");
      setDirection("");
      setComposeOpen(false);
      await reload();
      router.push(`/d/${slug}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!composeOpen) return null;

  return (
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="compose-title">
        <div className="sheet-bar">
          <button type="button" className="text-button" onClick={close} disabled={busy}>Cancel</button>
          <h2 id="compose-title" className="sheet-title">New Idea</h2>
          <button type="button" className="text-button strong" onClick={save} disabled={busy || !idea.trim()}>
            {busy ? <Spinner size={16} /> : "Save"}
          </button>
        </div>
        <div className="sheet-body">
          <AutoTextarea
            ref={ideaRef}
            className="compose-idea"
            value={idea}
            onChange={setIdea}
            minRows={6}
            placeholder="What's the idea? Type it or dictate it. Rambling is fine."
            aria-label="Idea"
          />
          <div className="compose-direction">
            <AutoTextarea
              value={direction}
              onChange={setDirection}
              minRows={1}
              placeholder="Direction for Claude (optional)"
              aria-label="Direction for Claude"
            />
            <p className="field-footer">For example: about 30 seconds, part 4 of the wedding series.</p>
          </div>
          {error && <p className="inline-error" role="alert">{error}</p>}
        </div>
      </div>
    </div>
  );
}
