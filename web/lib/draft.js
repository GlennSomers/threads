// Reading and writing draft files (markdown with simple frontmatter).

export const SECTIONS = [
  "Idea",
  "Direction",
  "Script",
  "On-screen text",
  "Caption",
  "Claude's notes",
];

export const STATUSES = ["idea", "refining", "refined", "error", "archived"];

const META_ORDER = ["title", "status", "created", "updated"];

export function parseDraft(text) {
  const norm = String(text || "").replace(/\r\n/g, "\n");
  const meta = {};
  let body = norm;

  const fm = norm.match(/^---\n([\s\S]*?)\n---[ \t]*\n?/);
  if (fm) {
    body = norm.slice(fm[0].length);
    for (const line of fm[1].split("\n")) {
      const i = line.indexOf(":");
      if (i === -1) continue;
      const key = line.slice(0, i).trim();
      let value = line.slice(i + 1).trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        try {
          value = JSON.parse(value);
        } catch {
          value = value.slice(1, -1);
        }
      }
      if (key) meta[key] = value;
    }
  }

  const sections = Object.fromEntries(SECTIONS.map((s) => [s, ""]));
  const parts = body.split(/^## +(.+?)[ \t]*$/m);
  for (let i = 1; i < parts.length; i += 2) {
    const name = parts[i].trim();
    const content = (parts[i + 1] || "").replace(/^\n+/, "").replace(/\s+$/, "");
    const known = SECTIONS.find((s) => s.toLowerCase() === name.toLowerCase());
    sections[known || name] = content;
  }

  return { meta, sections };
}

export function serializeDraft({ meta, sections }) {
  const keys = [
    ...META_ORDER.filter((k) => meta[k] !== undefined),
    ...Object.keys(meta).filter((k) => !META_ORDER.includes(k)),
  ];
  const fmLines = keys.map((k) => {
    const v = String(meta[k] ?? "").replace(/\n/g, " ");
    return k === "title" ? `title: ${JSON.stringify(v)}` : `${k}: ${v}`;
  });

  const names = [
    ...SECTIONS,
    ...Object.keys(sections).filter((s) => !SECTIONS.includes(s)),
  ];
  const body = names
    .map((name) => {
      const content = String(sections[name] ?? "").replace(/\r\n/g, "\n").trim();
      return content ? `## ${name}\n\n${content}\n` : `## ${name}\n\n`;
    })
    .join("\n");

  return `---\n${fmLines.join("\n")}\n---\n\n${body}`;
}

export function slugify(text) {
  return String(text || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");
}

export function newSlug(title, now = new Date()) {
  const date = now.toISOString().slice(0, 10);
  const rand = Math.random().toString(36).slice(2, 6).padEnd(4, "0");
  return `${date}-${slugify(title) || "idea"}-${rand}`;
}

export function isValidSlug(slug) {
  return typeof slug === "string" && /^[a-z0-9-]{1,120}$/.test(slug);
}

export function titleFromIdea(idea) {
  const first = String(idea || "")
    .split("\n")
    .map((l) => l.trim())
    .find(Boolean) || "Untitled idea";
  return first.length > 60 ? `${first.slice(0, 57).trimEnd()}…` : first;
}

export function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function wordCount(script) {
  return String(script || "")
    .split("\n")
    .filter((line) => !/^\s*\[.*\]\s*$/.test(line))
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
}
