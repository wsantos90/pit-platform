import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/types";

type RateLimitEntry = {
  timestamps: number[];
};

const rateLimitStore = new Map<string, RateLimitEntry>();
const rateLimitWindowMs = 60_000;
const rateLimitMax = 12;

function withSessionCookies(baseResponse: NextResponse, target: NextResponse) {
  baseResponse.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
  return target;
}

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

function shouldRateLimit(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password"
  );
}

function isRateLimited(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (!shouldRateLimit(pathname)) return false;
  const ip = getClientIp(request);
  const key = `${ip}:${pathname}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((timestamp) => now - timestamp < rateLimitWindowMs);
  entry.timestamps.push(now);
  rateLimitStore.set(key, entry);
  return entry.timestamps.length > rateLimitMax;
}

function applySecurityHeaders(response: NextResponse, request: NextRequest) {
  const origin = request.headers.get("origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "img-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "connect-src 'self' https: wss:",
    ].join("; ")
  );
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  response.headers.set("Access-Control-Allow-Credentials", "true");
  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  }
  return response;
}

function hasMaliciousInput(request: NextRequest) {
  const values = Array.from(request.nextUrl.searchParams.values());
  const combined = values.join(" ").toLowerCase();
  if (!combined) return false;
  const patterns = [
    "<script",
    "javascript:",
    "onerror=",
    "onload=",
    "<img",
    "<svg",
    "union select",
    "or 1=1",
    "' or '1'='1",
    "\" or \"1\"=\"1",
    "--",
    ";--",
    "/*",
    "*/",
  ];
  return patterns.some((pattern) => combined.includes(pattern));
}

function isPublicRoute(pathname: string) {
  const publicRoutes = [
    "/",
    "/login",
    "/register",
    "/forgot-password",
    "/rankings",
    "/hall-of-fame",
    "/payment/success",
    "/payment/failure",
    "/payment/pending",
    "/api/mcp",
    "/.well-known/oauth-protected-resource",
  ];
  if (publicRoutes.includes(pathname)) return true;
  return false;
}

function isProtectedApi(pathname: string) {
  const protectedApiPrefixes = [
    "/api/matchmaking",
    "/api/claim/submit",
    "/api/claim/review",
    "/api/tournament",
    "/api/discovery/insert-manual",
  ];
  return protectedApiPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function getRequiredRoles(pathname: string): UserRole[] | null {
  const rules: Array<{ prefix: string; roles: UserRole[] }> = [
    { prefix: "/admin", roles: ["admin"] },
    { prefix: "/moderation", roles: ["moderator", "admin"] },
    { prefix: "/team", roles: ["manager", "admin"] },
    { prefix: "/matchmaking", roles: ["player", "manager", "admin"] },
    { prefix: "/profile", roles: ["player", "manager", "moderator", "admin"] },
    { prefix: "/tournaments", roles: ["player", "manager", "moderator", "admin"] },
    { prefix: "/api/claim/review", roles: ["moderator", "admin"] },
    { prefix: "/api/claim/submit", roles: ["player", "manager", "admin"] },
    { prefix: "/api/matchmaking", roles: ["player", "manager", "admin"] },
    { prefix: "/api/tournament", roles: ["manager", "admin"] },
    { prefix: "/api/discovery/insert-manual", roles: ["admin"] },
  ];
  const match = rules.find((rule) => pathname.startsWith(rule.prefix));
  return match?.roles ?? null;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  if (request.method === "OPTIONS") {
    return applySecurityHeaders(response, request);
  }

  if (isRateLimited(request)) {
    const rateLimited = NextResponse.json(
      { error: "rate_limited" },
      { status: 429 }
    );
    rateLimited.headers.set("Retry-After", "60");
    return applySecurityHeaders(rateLimited, request);
  }

  if (hasMaliciousInput(request)) {
    const blocked = NextResponse.json(
      { error: "invalid_request" },
      { status: 400 }
    );
    return applySecurityHeaders(blocked, request);
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const bearer = request.headers.get("authorization")?.replace("Bearer ", "");
  const {
    data: { user },
  } = await supabase.auth.getUser(bearer || undefined);

  const pathname = request.nextUrl.pathname;
  const publicRoute = isPublicRoute(pathname) || (!isProtectedApi(pathname) && !pathname.startsWith("/api"));

  if (!user && !publicRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    if (pathname.startsWith("/")) {
      loginUrl.searchParams.set("next", pathname);
    }
    console.warn("unauthorized_access", {
      pathname,
      ip: getClientIp(request),
      reason: "missing_user",
    });
    const redirectResponse = NextResponse.redirect(loginUrl);
    return applySecurityHeaders(
      withSessionCookies(response, redirectResponse),
      request
    );
  }

  if (user) {
    const requiredRoles = getRequiredRoles(pathname);
    if (requiredRoles && requiredRoles.length > 0) {
      const { data: userRow } = await supabase
        .from("users")
        .select("roles, is_active")
        .eq("id", user.id)
        .maybeSingle();
      const roles = (userRow?.roles ?? []) as UserRole[];
      const active = userRow?.is_active ?? true;
      const hasRole = roles.some((role) => requiredRoles.includes(role));
      if (!active || !hasRole) {
        console.warn("unauthorized_access", {
          pathname,
          ip: getClientIp(request),
          reason: !active ? "inactive_user" : "insufficient_role",
          userId: user.id,
          roles,
        });
        if (pathname.startsWith("/api")) {
          return applySecurityHeaders(
            NextResponse.json({ error: "forbidden" }, { status: 403 }),
            request
          );
        }
        const fallbackUrl = request.nextUrl.clone();
        fallbackUrl.pathname = "/profile";
        const redirectResponse = NextResponse.redirect(fallbackUrl);
        return applySecurityHeaders(
          withSessionCookies(response, redirectResponse),
          request
        );
      }
    }
  }

  return applySecurityHeaders(response, request);
}
