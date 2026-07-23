/**
 * ==============================================================================
 * NEXT.JS ROUTE PROTECTION MIDDLEWARE (src/middleware.ts)
 * ==============================================================================
 * PURPOSE:
 *  Intercepts incoming HTTP requests at the edge before pages or API routes execute.
 *  Enforces authentication and role-based access control (RBAC).
 *
 * ROUTING & RBAC RULES (Interview Talking Points):
 *  1. Public Route (`/login`):
 *     If an unauthenticated user visits `/login`, allow access.
 *     If an already logged-in user visits `/login`, redirect to their dashboard (`/` or `/admin`).
 *
 *  2. Admin Guard (`/admin` & `/api/admin/*`):
 *     Only users with `role === "admin"` can access admin paths. Operators are redirected to `/`.
 *
 *  3. Operator Guard (`/`):
 *     Admins are redirected to `/admin` so they never accidentally operate the batch plant.
 *
 *  4. Negative Matcher Regex:
 *     Ignores static assets (images, CSS, JS bundles) and auth endpoints (`/api/auth/*`)
 *     so static files load instantly without triggering token checks.
 * ==============================================================================
 */

import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("⚠️  CRITICAL: JWT_SECRET is not set in environment variables. Auth will fail.");
}

const secretKey = new TextEncoder().encode(JWT_SECRET ?? "");

async function verifySession(token: string) {
  if (!JWT_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as { id: string; username: string; role: string };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Extract session token from request cookies
  const sessionCookie = request.cookies.get("session");
  let session: { id: string; username: string; role: string } | null = null;
  if (sessionCookie?.value) {
    session = await verifySession(sessionCookie.value);
  }

  const isLoggedIn = !!session;

  // 1. Unauthenticated /login route check
  if (pathname === "/login") {
    if (isLoggedIn) {
      const dest = session!.role === "admin" ? "/admin" : "/";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  // 2. Unauthenticated user trying to access protected page → redirect to /login
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Admin user trying to access operator dashboard → send to /admin
  if (session!.role === "admin" && !pathname.startsWith("/admin") && !pathname.startsWith("/api")) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // 4. Operator user trying to access admin panel → send back to /
  if (pathname.startsWith("/admin") && session!.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 5. Operator trying to execute admin API → block with 403 Forbidden
  if (pathname.startsWith("/api/admin") && session!.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protect all paths except auth APIs and static files
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.webp|.*\\.ico).*)",
  ],
};
