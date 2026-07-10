import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request and forwards the
 * updated auth cookies. Without this, server-rendered pages can see a stale
 * or expired session. Route protection (redirecting logged-out users) will be
 * layered in here during the auth phase.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: Do not run any logic between createServerClient and getUser().
  // getUser() revalidates the token; skipping it can cause hard-to-debug
  // random logouts.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Route protection: everything except /login and /auth/* requires a session.
  const { pathname } = request.nextUrl;
  const isPublic = pathname.startsWith("/login") || pathname.startsWith("/auth");

  // Redirects must carry any auth cookies getUser() just refreshed, or the
  // session refresh is silently lost.
  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies
      .getAll()
      .forEach((cookie) => response.cookies.set(cookie));
    return response;
  };

  if (!user && !isPublic) {
    return redirectTo("/login");
  }

  // Already signed in? Skip the login page.
  if (user && pathname.startsWith("/login")) {
    return redirectTo("/");
  }

  return supabaseResponse;
}
