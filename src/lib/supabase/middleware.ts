import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Fast path: Public routes and static assets need zero network auth checks
  const PUBLIC_ROUTES = ["/login", "/forgot-password", "/reset-password"];
  const isPublicRoute = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
  const isStaticAsset = pathname.startsWith("/_next") || pathname.startsWith("/favicon.ico");

  if (isPublicRoute || isStaticAsset) {
    return NextResponse.next();
  }

  // 2. Fast path: If Supabase env vars are missing, pass through without hanging
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn("[middleware] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return NextResponse.next();
  }

  // 3. Fast path: If no Supabase auth cookies exist, user is definitely not logged in
  const cookies = request.cookies.getAll();
  const hasAuthCookie = cookies.some(
    (c) => c.name.startsWith("sb-") || c.name.includes("auth-token")
  );

  if (!hasAuthCookie) {
    // For API routes, allow the handler to return 401 or verify custom tokens
    if (pathname.startsWith("/api/")) {
      return NextResponse.next();
    }
    // For protected pages, redirect immediately to login with zero network latency
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // 4. Authenticated request: Refresh session with a strict 2-second timeout guard
  let response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    // 4000ms timeout prevents Edge hanging while accommodating normal serverless latency
    const timeoutPromise = new Promise<{ data: { user: null }; error: Error }>((_, reject) => {
      setTimeout(() => reject(new Error("Supabase auth timeout")), 4000);
    });

    const { data: { user }, error } = await Promise.race([
      supabase.auth.getUser(),
      timeoutPromise,
    ]);

    // If getUser explicitly returned an auth error (not timeout) and no user:
    // Only redirect full page GET requests, never RSC prefetch or API requests
    const isRsc = request.headers.get("rsc") === "1" || request.nextUrl.searchParams.has("_rsc");
    if (error && !user && !pathname.startsWith("/api/") && !isRsc) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      return NextResponse.redirect(loginUrl);
    }

    return response;
  } catch (err) {
    console.warn("[middleware] Session refresh error or timeout, continuing with existing session:", err);
    // On network failure or timeout, allow request to pass through to the page Server Component
    // where getCurrentUser() handles auth with full Node.js runtime retry/error handling.
    return response;
  }
}
