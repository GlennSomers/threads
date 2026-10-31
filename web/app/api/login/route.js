import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  checkPassword,
  cookieOptions,
  newSessionValue,
  passwordIsSet,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!passwordIsSet()) {
    return NextResponse.json(
      { error: "APP_PASSWORD isn't set on the server yet." },
      { status: 500 }
    );
  }
  const { password } = await request.json().catch(() => ({}));
  if (!checkPassword(password)) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, newSessionValue(), cookieOptions());
  return res;
}
