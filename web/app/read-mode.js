"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, RouteChip } from "./components";

const MIN = 22;
const MAX = 96;
// Bigger by default on a Mac screen, which sits further from the camera.
const defaultSize = () => (typeof window !== "undefined" && window.innerWidth >= 900 ? 56 : 34);
const STORE_KEY = "reel-drafts:read-size";

/** Full-screen script, set like a national-route road sign, for reading while filming. */
export default function ReadMode({ title, script, seconds, onClose }) {
  const [size, setSize] = useState(34);
  const [awake, setAwake] = useState(false);
  const closeRef = useRef(null);

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(STORE_KEY));
      setSize(saved >= MIN && saved <= MAX ? saved : defaultSize());
      return;
    } catch {}
    setSize(defaultSize());
  }, []);

  function changeSize(v) {
    setSize(v);
    try {
      localStorage.setItem(STORE_KEY, String(v));
    } catch {}
  }

  // Keep the screen on while the script is up.
  useEffect(() => {
    let lock = null;
    let cancelled = false;
    async function request() {
      try {
        if ("wakeLock" in navigator && document.visibilityState === "visible") {
          lock = await navigator.wakeLock.request("screen");
          if (!cancelled) setAwake(true);
          lock.addEventListener?.("release", () => !cancelled && setAwake(false));
        }
      } catch {
        setAwake(false);
      }
    }
    request();
    const onVis = () => document.visibilityState === "visible" && request();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      lock?.release?.().catch(() => {});
    };
  }, []);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const lines = String(script || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div className="read-mode" role="dialog" aria-modal="true" aria-label={`Read: ${title}`}>
      <div className="sign" style={{ "--read-size": `${size}px` }}>
        <div className="sign-top">
          <RouteChip seconds={seconds} large />
          <span className="sign-title">{title}</span>
          <button ref={closeRef} type="button" className="sign-close" onClick={onClose} aria-label="Close Read mode">
            <Icon.Close size={22} />
          </button>
        </div>

        <div className="sign-script">
          {lines.length === 0 ? (
            <p className="sign-line">No script yet.</p>
          ) : (
            lines.map((line, i) =>
              /^\[.*\]$/.test(line) ? (
                <p key={i} className="sign-cue">{line.slice(1, -1)}</p>
              ) : (
                <p key={i} className="sign-line">{line}</p>
              )
            )
          )}
        </div>

        <div className="sign-bottom">
          <span className="sign-a small" aria-hidden="true">A</span>
          <input
            type="range"
            min={MIN}
            max={MAX}
            step={2}
            value={size}
            onChange={(e) => changeSize(Number(e.target.value))}
            aria-label="Text size"
          />
          <span className="sign-a big" aria-hidden="true">A</span>
        </div>
        {awake && <p className="sign-awake">Screen stays on while this is open</p>}
      </div>
    </div>
  );
}
