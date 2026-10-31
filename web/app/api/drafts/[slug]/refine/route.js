import { json, requireAuth, errorResponse } from "@/lib/api";
import { actionsUrl, dispatchRefine, putDraftFile } from "@/lib/github";
import { STATUSES, isValidSlug, nowIso, serializeDraft } from "@/lib/draft";

export const dynamic = "force-dynamic";

// Saves the current edits with status "refining", then starts the GitHub workflow.
export async function POST(request, { params }) {
  const denied = requireAuth(request);
  if (denied) return denied;
  const { slug } = await params;
  if (!isValidSlug(slug)) return json({ error: "Bad draft name." }, 400);

  try {
    const body = await request.json().catch(() => ({}));
    if (!body.sha || !body.meta || !body.sections) {
      return json({ error: "Missing sha, meta or sections." }, 400);
    }
    if (!String(body.sections.Idea || "").trim()) {
      return json({ error: "Add an idea before refining." }, 400);
    }

    const previousStatus = STATUSES.includes(body.meta.status) ? body.meta.status : "idea";
    const meta = { ...body.meta, status: "refining", updated: nowIso() };
    const sha = await putDraftFile(slug, serializeDraft({ meta, sections: body.sections }), {
      sha: body.sha,
      message: `Refine requested: ${meta.title || slug}`,
    });

    try {
      await dispatchRefine(slug);
    } catch (err) {
      // Put the status back so the draft isn't stuck on "refining".
      const restored = { ...meta, status: previousStatus === "refining" ? "idea" : previousStatus };
      const restoredSha = await putDraftFile(
        slug,
        serializeDraft({ meta: restored, sections: body.sections }),
        { sha, message: `Refine failed to start: ${meta.title || slug}` }
      ).catch(() => sha);
      return json(
        {
          error:
            "Couldn't start the refine on GitHub. Check that the workflow file is on your main branch and the token has Actions: read and write.",
          detail: err.message,
          sha: restoredSha,
          meta: restored,
        },
        502
      );
    }

    return json({ sha, meta, actionsUrl: actionsUrl() });
  } catch (err) {
    return errorResponse(err);
  }
}
