// Shared helpers for route handlers.
import { NextResponse } from "next/server";
import { isAuthed } from "./auth";

export function json(data, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function requireAuth(request) {
  return isAuthed(request) ? null : json({ error: "Please log in." }, 401);
}

export function errorResponse(err) {
  const status = err?.status;
  if (status === 404) return json({ error: "Not found on GitHub." }, 404);
  if (status === 409 || status === 422) {
    return json(
      { error: "This draft changed on GitHub since you opened it. Reload to get the latest.", conflict: true },
      409
    );
  }
  if (status === 401 || status === 403) {
    return json(
      { error: "GitHub refused the request. Check the token's permissions (Contents and Actions: read and write)." },
      502
    );
  }
  console.error(err);
  return json({ error: err?.message || "Something went wrong." }, 500);
}
