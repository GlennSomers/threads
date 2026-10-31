import { json, requireAuth, errorResponse } from "@/lib/api";
import { getDraftFile, putDraftFile } from "@/lib/github";
import { STATUSES, isValidSlug, nowIso, parseDraft, serializeDraft } from "@/lib/draft";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const denied = requireAuth(request);
  if (denied) return denied;
  const { slug } = await params;
  if (!isValidSlug(slug)) return json({ error: "Bad draft name." }, 400);
  try {
    const { text, sha } = await getDraftFile(slug);
    const { meta, sections } = parseDraft(text);
    return json({ slug, sha, meta, sections });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(request, { params }) {
  const denied = requireAuth(request);
  if (denied) return denied;
  const { slug } = await params;
  if (!isValidSlug(slug)) return json({ error: "Bad draft name." }, 400);
  try {
    const body = await request.json().catch(() => ({}));
    if (!body.sha || !body.meta || !body.sections) {
      return json({ error: "Missing sha, meta or sections." }, 400);
    }
    const meta = { ...body.meta, updated: nowIso() };
    if (!STATUSES.includes(meta.status)) meta.status = "idea";
    if (meta.status === "refining") {
      return json({ error: "Use the Refine button to start a refine." }, 400);
    }
    const text = serializeDraft({ meta, sections: body.sections });
    const sha = await putDraftFile(slug, text, {
      sha: body.sha,
      message: `Edit: ${meta.title || slug}`,
    });
    return json({ sha, meta });
  } catch (err) {
    return errorResponse(err);
  }
}
