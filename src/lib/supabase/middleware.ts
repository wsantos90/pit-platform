import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/types";
import { hasAnyRole } from "@/lib/auth/roles";

type RateLimitEntry = {
  timestamps: number[];
};

const rateLimitStore = new Map<string, RateLimitEntry>();
const rateLimitWindowMs = 60_000;
const rateLimitMax = 12;

export function withSessionCookies(baseResponse: NextResponse, target: NextResponse) {
  baseResponse.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
  return target;
}

export function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export function shouldRateLimit(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password"
  );
}

export function isRateLimited(request: NextRequest) {
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

export function applySecurityHeaders(response: NextResponse, request: NextRequest) {
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

export function hasMaliciousInput(request: NextRequest) {
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

export function isPublicRoute(pathname: string) {
  const publicRoutes = [
    "/",
    "/login",
    "/register",
    "/forgot-password",
    "/unauthorized",
    "/rankings",
    "/hall-of-fame",
    "/payment/success",
    "/payment/failure",
    "/payment/pending",
  ];
  if (publicRoutes.includes(pathname)) return true;
  return false;
}

export function isProtectedApi(pathname: string) {
  const protectedApiPrefixes = [
    "/api/matchmaking",
    "/api/claim/submit",
    "/api/claim/review",
    "/api/moderation",
    "/api/tournament",
    "/api/discovery/insert-manual",
  ];
  return protectedApiPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export function isWebhookRoute(pathname: string) {
  const webhookPrefixes = [
    "/api/ea/",
    "/api/cron/",
    "/api/admin/seed-players",
    "/api/admin/ingest-raw",
    "/api/matchmaking/expire",
    "/api/matchmaking/match",
  ];
  return webhookPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export function getRequiredRoles(pathname: string): UserRole[] | null {
  const rules: Array<{ prefix: string; roles: UserRole[] }> = [
    { prefix: "/admin", roles: ["admin"] },
    { prefix: "/moderation", roles: ["moderator", "admin"] },
    { prefix: "/team/claim", roles: ["player", "manager", "admin"] },
    { prefix: "/team", roles: ["manager", "moderator", "admin"] },
    { prefix: "/matchmaking", roles: ["manager", "moderator", "admin"] },
    { prefix: "/profile", roles: ["player", "manager", "moderator", "admin"] },
    { prefix: "/tournaments", roles: ["manager", "moderator", "admin"] },
    { prefix: "/api/claim/review", roles: ["moderator", "admin"] },
    { prefix: "/api/moderation", roles: ["moderator", "admin"] },
    { prefix: "/api/claim/submit", roles: ["player", "manager", "admin"] },
    { prefix: "/api/matchmaking", roles: ["manager", "moderator", "admin"] },
    { prefix: "/api/tournament/enroll", roles: ["manager", "moderator", "admin"] },
    { prefix: "/api/tournament", roles: ["moderator", "admin"] },
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

  // Rotas webhook têm sua própria autenticação (x-webhook-secret/x-cron-secret) — bypass do middleware auth
  const webhookSecret =
    request.headers.get("x-webhook-secret") ?? request.headers.get("x-cron-secret");
  const expectedWebhookSecret = process.env.N8N_WEBHOOK_SECRET;
  if (isWebhookRoute(pathname) && expectedWebhookSecret && webhookSecret === expectedWebhookSecret) {
    return applySecurityHeaders(response, request);
  }

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
      const { data: userById, error: userByIdError } = await supabase
        .from("users")
        .select("roles, is_active")
        .eq("id", user.id)
        .maybeSingle();
      if (userByIdError) {
        console.warn("user_profile_lookup_failed", {
          pathname,
          authUserId: user.id,
          email: user.email ?? null,
          stage: "by_id",
          error: userByIdError.message,
        });
      }

      let userRow = userById;
      if (!userRow && user.email) {
        const { data: userByEmail, error: userByEmailError } = await supabase
          .from("users")
          .select("id, roles, is_active")
          .eq("email", user.email)
          .maybeSingle();
        if (userByEmailError) {
          console.warn("user_profile_lookup_failed", {
            pathname,
            authUserId: user.id,
            email: user.email,
            stage: "by_email",
            error: userByEmailError.message,
          });
        }

        if (userByEmail) {
          userRow = {
            roles: userByEmail.roles,
            is_active: userByEmail.is_active,
          };
          console.warn("auth_user_profile_mismatch", {
            pathname,
            authUserId: user.id,
            profileUserId: userByEmail.id,
            email: user.email,
          });
        }
      }

      const roles = (userRow?.roles ?? []) as UserRole[];
      const active = userRow?.is_active ?? true;
      const isAllowed = hasAnyRole(roles, requiredRoles);
      if (!active || !isAllowed) {
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
        fallbackUrl.pathname = "/unauthorized";
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
