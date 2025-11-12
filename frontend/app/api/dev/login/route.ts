import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Dev-only helper to set a mock auth token and role cookies, then redirect
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const role = url.searchParams.get("role") || "admin"; // default admin
  const next = url.searchParams.get("next") || (role === "operator" ? "/panel-operatora" : "/admin");

  // Create a mock token
  const token = `dev-${role}-token-${Math.random().toString(36).slice(2, 8)}`;

  const res = NextResponse.redirect(new URL(next, url.origin));
  // Cookie visible to middleware (client-side cannot set httpOnly)
  // For dev we skip httpOnly to keep things simple
  res.cookies.set("auth-token", token, {
    path: "/",
    sameSite: "lax",
  });
  res.cookies.set("auth-role", role, {
    path: "/",
    sameSite: "lax",
  });

  try {
    console.info(
      "[dev.login]",
      JSON.stringify({ role, next, setToken: true }),
    );
  } catch {}

  return res;
}
