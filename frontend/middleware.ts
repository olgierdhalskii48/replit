import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protected routes that require authentication
  const protectedRoutes = ["/admin", "/panel-operatora", "/panel-klienta"];

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );

  if (isProtectedRoute) {
    const token = request.cookies.get("auth-token")?.value;
    try {
      console.info(
        "[middleware]",
        JSON.stringify({ path: pathname, hasToken: Boolean(token) }),
      );
    } catch {}

    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = "/logowanie";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    // Optional strict role check for admin/operator area
    const strict = process.env.STRICT_ROLE_CHECK === 'true' || (process.env.NODE_ENV === 'production' && process.env.STRICT_ROLE_CHECK !== 'false');
    if ((pathname.startsWith("/admin") || pathname.startsWith("/panel-operatora")) && strict) {
      const backend = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (backend) {
        try {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), 2500);
          const res = await fetch(`${backend.replace(/\/$/, '')}/api/v1/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          });
          clearTimeout(id);
          if (!res.ok) {
            const url = request.nextUrl.clone();
            url.pathname = "/logowanie";
            url.searchParams.set("next", pathname);
            return NextResponse.redirect(url);
          }
          const body = await res.json().catch(() => null);
          const role = (body as any)?.user?.role || (body as any)?.role;
          // Rules: /admin requires admin; /panel-operatora requires operator or admin
          const isAdmin = role === 'admin';
          const isOperator = role === 'operator';
          if (pathname.startsWith('/admin')) {
            if (!isAdmin) {
              const url = request.nextUrl.clone();
              url.pathname = "/logowanie";
              url.searchParams.set("next", pathname);
              return NextResponse.redirect(url);
            }
          } else if (pathname.startsWith('/panel-operatora')) {
            if (!(isOperator || isAdmin)) {
              const url = request.nextUrl.clone();
              url.pathname = "/logowanie";
              url.searchParams.set("next", pathname);
              return NextResponse.redirect(url);
            }
          }
        } catch {
          const url = request.nextUrl.clone();
          url.pathname = "/logowanie";
          url.searchParams.set("next", pathname);
          return NextResponse.redirect(url);
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/panel-operatora/:path*", "/panel-klienta/:path*"],
};
