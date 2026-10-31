import { json, requireAuth, errorResponse } from "@/lib/api";
import { listDraftFiles, putDraftFile } from "@/lib/github";
import {
  SECTIONS,
  newSlug,
  nowIso,
  parseDraft,
  serializeDraft,
  titleFromIdea,
} from "@/lib/draft";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const denied = requireAuth(request);
  if (denied) return denied;
  try {
    const files = await listDraftFiles();
    const drafts = files
      .map(({ slug, text }) => {
        const { meta, sections } = parseDraft(text);
        const preview = (sections.Script || sections.Idea || "")
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l && !/^\[.*\]$/.test(l))
          .join(" ")
          .slice(0, 140);
        return {
          slug,
          title: meta.title || slug,
          status: meta.status || "idea",
          created: meta.created || "",
          updated: meta.updated || meta.created || "",
          preview,
        };
      })
      .sort((a, b) => (b.updated || "").localeCompare(a.updated || ""));
    return json({ drafts });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request) {
  const denied = requireAuth(request);
  if (denied) return denied;
  try {
    const body = await request.json().catch(() => ({}));
    const idea = String(body.idea || "").trim();
    if (!idea) return json({ error: "Write something first." }, 400);
    const title = String(body.title || "").trim() || titleFromIdea(idea);
    const slug = newSlug(title);
    const now = nowIso();
    const sections = Object.fromEntries(SECTIONS.map((s) => [s, ""]));
    sections.Idea = idea;
    sections.Direction = String(body.direction || "").trim();
    const text = serializeDraft({
      meta: { title, status: "idea", created: now, updated: now },
      sections,
    });
    await putDraftFile(slug, text, { message: `New idea: ${title}` });
    return json({ slug }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
