import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0].toLowerCase();
  const requestId =
    request.headers.get("x-request-id") ||
    `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  // Forward requestId on downstream request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  // Helper to add requestId to responses
  const withRequestId = (res: NextResponse) => {
    res.headers.set("x-request-id", requestId);
    return res;
  };

  // 1. Check Super Admin Auth for /admin/*
  if (pathname.startsWith("/admin")) {
    // Standalone Super Admin login page is public for unauthenticated admin sign-in
    if (pathname === "/admin/login") {
      const response = NextResponse.next({ request: { headers: requestHeaders } });
      response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      response.headers.set("Pragma", "no-cache");
      response.headers.set("Expires", "0");
      return withRequestId(response);
    }

    const sessionCookie = request.cookies.get("wvg_session");
    if (!sessionCookie?.value) {
      const adminLoginUrl = new URL("/admin/login", request.url);
      adminLoginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(adminLoginUrl);
    }

    // Verify session payload role in middleware
    try {
      const parts = sessionCookie.value.split(".");
      if (parts.length !== 2) {
        const adminLoginUrl = new URL("/admin/login", request.url);
        adminLoginUrl.searchParams.set("from", pathname);
        return NextResponse.redirect(adminLoginUrl);
      }

      const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf-8"));
      const isSuperAdmin = payload.role === "SUPER_ADMIN" || payload.role === "platform_admin";
      
      // Token expiration check
      if (payload.expiresAt && Date.now() > payload.expiresAt) {
        const adminLoginUrl = new URL("/admin/login", request.url);
        adminLoginUrl.searchParams.set("from", pathname);
        return NextResponse.redirect(adminLoginUrl);
      }

      if (!isSuperAdmin) {
        // Logged in as photographer, attempting to access /admin -> strictly block and route to admin login
        const adminLoginUrl = new URL("/admin/login", request.url);
        adminLoginUrl.searchParams.set("from", pathname);
        adminLoginUrl.searchParams.set("error", "unauthorized_admin");
        return NextResponse.redirect(adminLoginUrl);
      }
    } catch {
      const adminLoginUrl = new URL("/admin/login", request.url);
      adminLoginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(adminLoginUrl);
    }

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    // Cache control prevention: Ensure browser back button never shows cached admin data after logout
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    return withRequestId(response);
  }

  // 2. Check Photographer Auth for /dashboard/*, /projects/*, /clients/*, /settings/*, /billing/*, /communications/*
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/clients") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/billing") ||
    pathname.startsWith("/communications")
  ) {
    const sessionCookie = request.cookies.get("wvg_session");
    if (!sessionCookie?.value) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return withRequestId(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  // 3. Custom Domain Resolution (Host header routing)
  const platformDomain = (process.env.PLATFORM_DOMAIN || "drfilms.com").toLowerCase().trim();
  const isPlatformHost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".vercel.app") ||
    hostname === platformDomain ||
    hostname.endsWith(`.${platformDomain}`) ||
    hostname === "drfilms.com" ||
    hostname.endsWith(".drfilms.com");

  // Bypass internal infrastructure routes from custom domain rewrites
  const isInternalPath =
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/clients") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/billing") ||
    pathname.startsWith("/onboarding") ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/register" ||
    pathname === "/verify-email" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/domain-pending" ||
    pathname === "/favicon.ico";

  if (!isPlatformHost && !isInternalPath) {
    try {
      const resolveUrl = new URL(`/api/domains/resolve?hostname=${encodeURIComponent(hostname)}`, request.url);
      const res = await fetch(resolveUrl.toString(), {
        headers: { "x-internal-middleware": "1" },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.resolved) {
          const isVerifiedAndActive =
            data.verificationStatus === "verified" &&
            (data.status === "ACTIVE" || data.status === "active" || data.status === "VERIFIED" || data.status === "verified");

          if (isVerifiedAndActive) {
            // Forward custom domain header
            requestHeaders.set("x-custom-domain", hostname);
            if (data.photographerId) {
              requestHeaders.set("x-photographer-id", data.photographerId);
            }

            // If user directly browsed to /gallery/[accessCode], preserve the specific wedding code
            if (pathname.startsWith("/gallery/")) {
              const response = NextResponse.rewrite(new URL(pathname, request.url), {
                request: { headers: requestHeaders },
              });
              return withRequestId(response);
            }

            // If user browsed to root / or /gallery, rewrite to primary project access code
            if (data.accessCode) {
              const targetUrl = new URL(`/gallery/${data.accessCode}`, request.url);
              const response = NextResponse.rewrite(targetUrl, {
                request: { headers: requestHeaders },
              });
              return withRequestId(response);
            }
          } else {
            const pendingUrl = new URL("/domain-pending", request.url);
            return withRequestId(NextResponse.rewrite(pendingUrl, { request: { headers: requestHeaders } }));
          }
        }
      }
    } catch {
      // Fall through to standard routing on resolution error
    }
  }

  return withRequestId(NextResponse.next({ request: { headers: requestHeaders } }));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
