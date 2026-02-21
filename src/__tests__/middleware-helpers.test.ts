import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import {
  getClientIp,
  shouldRateLimit,
  isPublicRoute,
  isProtectedApi,
  getRequiredRoles,
  hasMaliciousInput,
} from "@/lib/supabase/middleware";

// Helper para criar NextRequest com headers customizados
function makeRequest(
  path: string,
  options: {
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  } = {}
): NextRequest {
  const url = new URL(`http://localhost${path}`);
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([k, v]) =>
      url.searchParams.set(k, v)
    );
  }
  return new NextRequest(url, {
    headers: new Headers(options.headers ?? {}),
  });
}

// ---------------------------------------------------------------------------
// getClientIp
// ---------------------------------------------------------------------------
describe("getClientIp", () => {
  it("retorna o primeiro IP do x-forwarded-for quando há múltiplos", () => {
    const req = makeRequest("/", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("retorna o único IP do x-forwarded-for", () => {
    const req = makeRequest("/", { headers: { "x-forwarded-for": "9.9.9.9" } });
    expect(getClientIp(req)).toBe("9.9.9.9");
  });

  it("retorna IP do x-real-ip quando x-forwarded-for está ausente", () => {
    const req = makeRequest("/", { headers: { "x-real-ip": "10.0.0.1" } });
    expect(getClientIp(req)).toBe("10.0.0.1");
  });

  it('retorna "unknown" quando nenhum header de IP está presente', () => {
    const req = makeRequest("/");
    expect(getClientIp(req)).toBe("unknown");
  });

  it("faz trim de espaços do x-forwarded-for", () => {
    const req = makeRequest("/", { headers: { "x-forwarded-for": "  3.3.3.3  , 4.4.4.4" } });
    expect(getClientIp(req)).toBe("3.3.3.3");
  });
});

// ---------------------------------------------------------------------------
// shouldRateLimit
// ---------------------------------------------------------------------------
describe("shouldRateLimit", () => {
  it("retorna true para /login", () => {
    expect(shouldRateLimit("/login")).toBe(true);
  });

  it("retorna true para /register", () => {
    expect(shouldRateLimit("/register")).toBe(true);
  });

  it("retorna true para /forgot-password", () => {
    expect(shouldRateLimit("/forgot-password")).toBe(true);
  });

  it("retorna false para /profile", () => {
    expect(shouldRateLimit("/profile")).toBe(false);
  });

  it("retorna false para /api/matchmaking", () => {
    expect(shouldRateLimit("/api/matchmaking")).toBe(false);
  });

  it("retorna false para / (homepage)", () => {
    expect(shouldRateLimit("/")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isPublicRoute
// ---------------------------------------------------------------------------
describe("isPublicRoute", () => {
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
  ];

  publicRoutes.forEach((route) => {
    it(`retorna true para ${route}`, () => {
      expect(isPublicRoute(route)).toBe(true);
    });
  });

  it("retorna false para /profile", () => {
    expect(isPublicRoute("/profile")).toBe(false);
  });

  it("retorna false para /admin", () => {
    expect(isPublicRoute("/admin")).toBe(false);
  });

  it("retorna false para /team", () => {
    expect(isPublicRoute("/team")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isProtectedApi
// ---------------------------------------------------------------------------
describe("isProtectedApi", () => {
  it("retorna true para /api/matchmaking/queue", () => {
    expect(isProtectedApi("/api/matchmaking/queue")).toBe(true);
  });

  it("retorna true para /api/claim/submit", () => {
    expect(isProtectedApi("/api/claim/submit")).toBe(true);
  });

  it("retorna true para /api/claim/review", () => {
    expect(isProtectedApi("/api/claim/review")).toBe(true);
  });

  it("retorna true para /api/tournament/create", () => {
    expect(isProtectedApi("/api/tournament/create")).toBe(true);
  });

  it("retorna true para /api/discovery/insert-manual", () => {
    expect(isProtectedApi("/api/discovery/insert-manual")).toBe(true);
  });

  it("retorna false para /api/ea/cookie (API não protegida)", () => {
    expect(isProtectedApi("/api/ea/cookie")).toBe(false);
  });

  it("retorna false para /api/payment/create (API não protegida)", () => {
    expect(isProtectedApi("/api/payment/create")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getRequiredRoles
// ---------------------------------------------------------------------------
describe("getRequiredRoles", () => {
  it('retorna ["admin"] para /admin', () => {
    expect(getRequiredRoles("/admin")).toEqual(["admin"]);
  });

  it('retorna ["admin"] para /admin/settings (sub-rota)', () => {
    expect(getRequiredRoles("/admin/settings")).toEqual(["admin"]);
  });

  it('retorna ["moderator", "admin"] para /moderation', () => {
    expect(getRequiredRoles("/moderation")).toEqual(["moderator", "admin"]);
  });

  it('retorna ["manager", "admin"] para /team', () => {
    expect(getRequiredRoles("/team")).toEqual(["manager", "admin"]);
  });

  it('retorna ["player", "manager", "admin"] para /matchmaking', () => {
    expect(getRequiredRoles("/matchmaking")).toEqual(["player", "manager", "admin"]);
  });

  it("retorna 4 roles para /profile", () => {
    expect(getRequiredRoles("/profile")).toEqual([
      "player",
      "manager",
      "moderator",
      "admin",
    ]);
  });

  it("retorna 4 roles para /tournaments", () => {
    expect(getRequiredRoles("/tournaments")).toEqual([
      "player",
      "manager",
      "moderator",
      "admin",
    ]);
  });

  it('retorna ["moderator", "admin"] para /api/claim/review', () => {
    expect(getRequiredRoles("/api/claim/review")).toEqual(["moderator", "admin"]);
  });

  it('retorna ["player", "manager", "admin"] para /api/claim/submit', () => {
    expect(getRequiredRoles("/api/claim/submit")).toEqual([
      "player",
      "manager",
      "admin",
    ]);
  });

  it('retorna ["player", "manager", "admin"] para /api/matchmaking/queue', () => {
    expect(getRequiredRoles("/api/matchmaking/queue")).toEqual([
      "player",
      "manager",
      "admin",
    ]);
  });

  it('retorna ["manager", "admin"] para /api/tournament/create', () => {
    expect(getRequiredRoles("/api/tournament/create")).toEqual([
      "manager",
      "admin",
    ]);
  });

  it('retorna ["admin"] para /api/discovery/insert-manual', () => {
    expect(getRequiredRoles("/api/discovery/insert-manual")).toEqual(["admin"]);
  });

  it("retorna null para /rankings (rota pública sem regra)", () => {
    expect(getRequiredRoles("/rankings")).toBeNull();
  });

  it("retorna null para /api/ea/cookie (API não protegida por role)", () => {
    expect(getRequiredRoles("/api/ea/cookie")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// hasMaliciousInput
// ---------------------------------------------------------------------------
describe("hasMaliciousInput", () => {
  it("retorna false quando não há query params", () => {
    const req = makeRequest("/search");
    expect(hasMaliciousInput(req)).toBe(false);
  });

  it("retorna false para query params inofensivos", () => {
    const req = makeRequest("/search", { searchParams: { q: "hello world" } });
    expect(hasMaliciousInput(req)).toBe(false);
  });

  it("detecta <script na query", () => {
    const req = makeRequest("/search", { searchParams: { q: "<script>alert(1)</script>" } });
    expect(hasMaliciousInput(req)).toBe(true);
  });

  it("detecta javascript: na query", () => {
    const req = makeRequest("/search", { searchParams: { url: "javascript:void(0)" } });
    expect(hasMaliciousInput(req)).toBe(true);
  });

  it("detecta onerror= na query", () => {
    const req = makeRequest("/search", { searchParams: { img: "x onerror=alert(1)" } });
    expect(hasMaliciousInput(req)).toBe(true);
  });

  it("detecta union select (SQL injection)", () => {
    const req = makeRequest("/search", { searchParams: { id: "1 union select * from users" } });
    expect(hasMaliciousInput(req)).toBe(true);
  });

  it("detecta -- (comentário SQL)", () => {
    const req = makeRequest("/search", { searchParams: { id: "1--" } });
    expect(hasMaliciousInput(req)).toBe(true);
  });

  it("detecta /* (abertura de comentário SQL)", () => {
    const req = makeRequest("/search", { searchParams: { id: "1 /* comment */" } });
    expect(hasMaliciousInput(req)).toBe(true);
  });

  it("é case-insensitive (UNION SELECT deve ser detectado)", () => {
    const req = makeRequest("/search", { searchParams: { id: "1 UNION SELECT email FROM users" } });
    expect(hasMaliciousInput(req)).toBe(true);
  });
});
