"use client";

import { useLayoutEffect, useRef, useState } from "react";

/* ---------- Icons (Lucide paths, ISC licence, drawn at one stroke weight) ---------- */

function Svg({ children, size = 22, strokeWidth = 1.9, label, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      {...rest}
    >
      {children}
    </svg>
  );
}

export const Icon = {
  Compose: (p) => (
    <Svg {...p}>
      <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
    </Svg>
  ),
  Back: (p) => (
    <Svg strokeWidth={2.4} {...p}>
      <path d="m15 18-6-6 6-6" />
    </Svg>
  ),
  Close: (p) => (
    <Svg strokeWidth={2.2} {...p}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Svg>
  ),
  Archive: (p) => (
    <Svg {...p}>
      <rect width="20" height="5" x="2" y="3" rx="1" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </Svg>
  ),
  Restore: (p) => (
    <Svg {...p}>
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </Svg>
  ),
  Copy: (p) => (
    <Svg {...p}>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </Svg>
  ),
  Check: (p) => (
    <Svg strokeWidth={2.4} {...p}>
      <path d="M20 6 9 17l-5-5" />
    </Svg>
  ),
  Alert: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </Svg>
  ),
  Read: (p) => (
    <Svg {...p}>
      <rect width="20" height="14" x="2" y="5" rx="3" />
      <path d="M6 10h12" />
      <path d="M6 14h8" />
    </Svg>
  ),
};

/** Yellow warning diamond, the road-sign mark for "refining". */
export function Diamond({ size = 16, label = "Refining" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" role="img" aria-label={label} className="diamond">
      <path d="M10 1.2 18.8 10 10 18.8 1.2 10z" fill="var(--route-yellow)" stroke="var(--diamond-edge)" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10 6v4.6" stroke="var(--diamond-edge)" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="10" cy="13.4" r="1.05" fill="var(--diamond-edge)" />
    </svg>
  );
}

/** iOS-style activity indicator. */
export function Spinner({ size = 18 }) {
  const spokes = Array.from({ length: 8 }, (_, i) => i);
  return (
    <svg className="spinner" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {spokes.map((i) => (
        <line
          key={i}
          x1="12"
          y1="3"
          x2="12"
          y2="7.5"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity={0.25 + (i / 8) * 0.75}
          transform={`rotate(${i * 45} 12 12)`}
        />
      ))}
    </svg>
  );
}

/** Road-sign route number: yellow on green. Used for spoken length. */
export function RouteChip({ seconds, large = false }) {
  if (!seconds) return null;
  return (
    <span className={`route-chip${large ? " large" : ""}`} aria-label={`About ${seconds} seconds spoken`}>
      {seconds}s
    </span>
  );
}

export function StatusMark({ status }) {
  if (status === "refining") return <Diamond />;
  if (status === "error") return <Icon.Alert size={18} className="mark-error" label="Refine didn't finish" />;
  return null;
}

/* ---------- Inputs ---------- */

export function AutoTextarea({ value, onChange, minRows = 2, className = "", ref: outerRef, ...rest }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  function setRefs(el) {
    ref.current = el;
    if (typeof outerRef === "function") outerRef(el);
    else if (outerRef) outerRef.current = el;
  }
  return (
    <textarea
      ref={setRefs}
      rows={minRows}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className={`field ${className}`}
      {...rest}
    />
  );
}

export function CopyButton({ text, label = "Copy" }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text || "");
      setDone(true);
      setTimeout(() => setDone(false), 1400);
    } catch {
      setDone(false);
    }
  }
  return (
    <button type="button" className="text-button" onClick={copy} disabled={!text}>
      {done ? <Icon.Check size={16} /> : <Icon.Copy size={16} />}
      {done ? "Copied" : label}
    </button>
  );
}

/* ---------- Helpers ---------- */

export function timeAgo(iso) {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return "Just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = new Date(t);
  const days = Math.round(h / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString("en-IE", { weekday: "long" });
  return d.toLocaleDateString("en-IE", { day: "numeric", month: "short" });
}

export async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    window.location.href = "/login";
    throw Object.assign(new Error("Please log in."), { status: 401 });
  }
  if (!res.ok) {
    throw Object.assign(new Error(data.error || `Request failed (${res.status})`), {
      status: res.status,
      data,
    });
  }
  return data;
}

export const SPEAKING_RATE = 2.75; // words per second, about 165 a minute
