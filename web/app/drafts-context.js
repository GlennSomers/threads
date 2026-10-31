"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./components";

const DraftsContext = createContext(null);

export function DraftsProvider({ children }) {
  const [drafts, setDrafts] = useState(null);
  const [error, setError] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);

  const reload = useCallback(async () => {
    try {
      const data = await api("/api/drafts");
      setDrafts(data.drafts);
      setError("");
    } catch (err) {
      if (err.status !== 401) setError(err.message);
      setDrafts((d) => d || []);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Keep the list fresh while anything is refining.
  useEffect(() => {
    if (!drafts?.some((d) => d.status === "refining")) return;
    const t = setInterval(reload, 10000);
    return () => clearInterval(t);
  }, [drafts, reload]);

  // Patch one row locally after a save, so the list doesn't wait for GitHub.
  const patch = useCallback((slug, fields) => {
    setDrafts((list) => list?.map((d) => (d.slug === slug ? { ...d, ...fields } : d)) || list);
  }, []);

  return (
    <DraftsContext.Provider
      value={{ drafts, error, reload, patch, composeOpen, setComposeOpen }}
    >
      {children}
    </DraftsContext.Provider>
  );
}

export function useDrafts() {
  return useContext(DraftsContext);
}
