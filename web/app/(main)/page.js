"use client";

import { useDrafts } from "../drafts-context";
import { Icon } from "../components";

// On the Mac the list sits beside this pane; on the iPhone this pane is hidden.
export default function NoDraftSelected() {
  const { drafts, setComposeOpen } = useDrafts();
  const hasDrafts = drafts?.some((d) => d.status !== "archived");
  return (
    <div className="empty-detail">
      <p className="empty-title">{hasDrafts ? "No draft open" : "No drafts yet"}</p>
      <p className="empty-text">
        {hasDrafts ? "Pick one from the list, or start a new idea." : "Start with a rough idea. Type it or dictate it."}
      </p>
      <button type="button" className="text-button large" onClick={() => setComposeOpen(true)}>
        <Icon.Compose size={18} /> New Idea
      </button>
    </div>
  );
}
