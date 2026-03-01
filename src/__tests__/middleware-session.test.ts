import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mock de @supabase/ssr — deve vir ANTES do import do módulo testado
// vi.hoisted garante que as variáveis existam antes do hoisting do vi.mock
// ---------------------------------------------------------------------------
const { mockGetUser, mockMaybeSingle, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockMaybeSingle: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

// Import depois do mock
import { updateSession } from "@/lib/supabase/middleware";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRequest(
  path: string,
  options: {
    method?: string;
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
    method: options.method ?? "GET",
    headers: new Headers(options.headers ?? {}),
  });
}

// Configura o mock para um usuário autenticado com roles específicas
function asAuthenticatedUser(roles: string[], isActive = true) {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "user-uuid-123", email: "user@example.com" } },
  });
  mockMaybeSingle.mockResolvedValue({
    data: { roles, is_active: isActive },
  });
}

// Configura cadeia de query builder do Supabase
beforeEach(() => {
  vi.clearAllMocks();

  // Padrão: usuário não autenticado
  mockGetUser.mockResolvedValue({ data: { user: null } });

  // Cadeia: .from().select().eq().maybeSingle()
  const queryBuilder = {
    select: () => queryBuilder,
    eq: () => queryBuilder,
    maybeSingle: mockMaybeSingle,
  };
  mockFrom.mockReturnValue(queryBuilder);
  mockMaybeSingle.mockResolvedValue({ data: null });
});

// ---------------------------------------------------------------------------
// SECURITY HEADERS
// ---------------------------------------------------------------------------
describe("security headers", () => {
  it("define X-Content-Type-Options: nosniff em todas as respostas", async () => {
    const res = await updateSession(makeRequest("/"));
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("define X-Frame-Options: DENY em todas as respostas", async () => {
    const res = await updateSession(makeRequest("/"));
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("define Strict-Transport-Security em todas as respostas", async () => {
    const res = await updateSession(makeRequest("/"));
    expect(res.headers.get("Strict-Transport-Security")).toContain("max-age=");
  });

  it("define Content-Security-Policy em todas as respostas", async () => {
    const res = await updateSession(makeRequest("/"));
    expect(res.headers.get("Content-Security-Policy")).toContain("default-src");
  });

  it("define Referrer-Policy em todas as respostas", async () => {
    const res = await updateSession(makeRequest("/"));
    expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("define Permissions-Policy em todas as respostas", async () => {
    const res = await updateSession(makeRequest("/"));
    expect(res.headers.get("Permissions-Policy")).toContain("camera=()");
  });

  it("define Access-Control-Allow-Origin quando Origin header está presente", async () => {
    const res = await updateSession(
      makeRequest("/", { headers: { origin: "https://pit.gg" } })
    );
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://pit.gg");
  });

  it("define Vary: Origin quando Origin header está presente", async () => {
    const res = await updateSession(
      makeRequest("/", { headers: { origin: "https://pit.gg" } })
    );
    expect(res.headers.get("Vary")).toBe("Origin");
  });
});

// ---------------------------------------------------------------------------
// OPTIONS PREFLIGHT
// ---------------------------------------------------------------------------
describe("requisições OPTIONS (preflight CORS)", () => {
  it("retorna resposta bem-sucedida para OPTIONS sem chamar o auth do Supabase", async () => {
    const req = makeRequest("/profile", { method: "OPTIONS" });
    const res = await updateSession(req);
    expect(res.status).toBe(200);
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("inclui headers CORS na resposta OPTIONS", async () => {
    const req = makeRequest("/profile", {
      method: "OPTIONS",
      headers: { origin: "https://pit.gg" },
    });
    const res = await updateSession(req);
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
  });

  it("não redireciona requisição OPTIONS mesmo para rota protegida", async () => {
    const req = makeRequest("/admin", { method: "OPTIONS" });
    const res = await updateSession(req);
    // Não deve ser redirect (3xx)
    expect(res.status).toBeLessThan(300);
  });
});

// ---------------------------------------------------------------------------
// RATE LIMITING
// ---------------------------------------------------------------------------
describe("rate limiting", () => {
  it("permite a 12ª requisição para /login (no limite)", async () => {
    // Usa IP único para não contaminar outros testes
    const ip = "192.168.100.1";
    for (let i = 0; i < 11; i++) {
      await updateSession(makeRequest("/login", { headers: { "x-forwarded-for": ip } }));
    }
    const res = await updateSession(
      makeRequest("/login", { headers: { "x-forwarded-for": ip } })
    );
    expect(res.status).not.toBe(429);
  });

  it("bloqueia a 13ª requisição para /login com status 429", async () => {
    const ip = "192.168.100.2";
    for (let i = 0; i < 12; i++) {
      await updateSession(makeRequest("/login", { headers: { "x-forwarded-for": ip } }));
    }
    const res = await updateSession(
      makeRequest("/login", { headers: { "x-forwarded-for": ip } })
    );
    expect(res.status).toBe(429);
  });

  it("inclui header Retry-After: 60 na resposta 429", async () => {
    const ip = "192.168.100.3";
    for (let i = 0; i < 12; i++) {
      await updateSession(makeRequest("/login", { headers: { "x-forwarded-for": ip } }));
    }
    const res = await updateSession(
      makeRequest("/login", { headers: { "x-forwarded-for": ip } })
    );
    expect(res.headers.get("Retry-After")).toBe("60");
  });

  it("retorna JSON { error: 'rate_limited' } no corpo da resposta 429", async () => {
    const ip = "192.168.100.4";
    for (let i = 0; i < 12; i++) {
      await updateSession(makeRequest("/login", { headers: { "x-forwarded-for": ip } }));
    }
    const res = await updateSession(
      makeRequest("/login", { headers: { "x-forwarded-for": ip } })
    );
    const body = await res.json();
    expect(body).toEqual({ error: "rate_limited" });
  });

  it("não aplica rate limit em /profile", async () => {
    // Usuário autenticado para evitar redirect
    asAuthenticatedUser(["player"]);
    const ip = "192.168.100.5";
    // Mais de 12 requisições em /profile não devem gerar 429
    for (let i = 0; i < 15; i++) {
      const res = await updateSession(
        makeRequest("/profile", { headers: { "x-forwarded-for": ip } })
      );
      expect(res.status).not.toBe(429);
    }
  });
});

// ---------------------------------------------------------------------------
// INPUT MALICIOSO
// ---------------------------------------------------------------------------
describe("detecção de input malicioso", () => {
  it("retorna 400 para requisição com <script na query", async () => {
    const req = makeRequest("/search", {
      searchParams: { q: "<script>alert(1)</script>" },
    });
    const res = await updateSession(req);
    expect(res.status).toBe(400);
  });

  it("retorna 400 para requisição com union select na query", async () => {
    const req = makeRequest("/search", {
      searchParams: { id: "1 union select * from users" },
    });
    const res = await updateSession(req);
    expect(res.status).toBe(400);
  });

  it("retorna JSON { error: 'invalid_request' } no corpo da resposta 400", async () => {
    const req = makeRequest("/search", {
      searchParams: { xss: "javascript:alert(1)" },
    });
    const res = await updateSession(req);
    const body = await res.json();
    expect(body).toEqual({ error: "invalid_request" });
  });

  it("inclui headers de segurança na resposta 400", async () => {
    const req = makeRequest("/search", {
      searchParams: { q: "<script>xss</script>" },
    });
    const res = await updateSession(req);
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  });
});

// ---------------------------------------------------------------------------
// USUÁRIO NÃO AUTENTICADO
// ---------------------------------------------------------------------------
describe("acesso de usuário não autenticado", () => {
  // O middleware delega a proteção de rotas de PÁGINA ao (dashboard)/layout.tsx
  // (Server Component). O middleware só bloqueia rotas de API sem autenticação.

  it("passa /profile sem redirecionar (middleware delega ao layout)", async () => {
    const res = await updateSession(makeRequest("/profile"));
    // O middleware deixa passar — a proteção real é no Server Component
    expect(res.status).toBeLessThan(300);
  });

  it("passa /admin sem redirecionar (role check só ocorre quando user existe)", async () => {
    const res = await updateSession(makeRequest("/admin"));
    expect(res.status).toBeLessThan(300);
  });

  it("redireciona /api/ea/fetch-matches para /login sem webhook secret (rotas de API requerem auth)", async () => {
    const res = await updateSession(makeRequest("/api/ea/fetch-matches"));
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("redireciona /api/ea/fetch-matches preservando ?next na URL", async () => {
    const res = await updateSession(makeRequest("/api/ea/fetch-matches"));
    expect(res.headers.get("location")).toContain("next=");
  });

  it("permite acesso a / sem autenticação", async () => {
    const res = await updateSession(makeRequest("/"));
    expect(res.status).toBeLessThan(300);
  });

  it("permite acesso a /login sem autenticação", async () => {
    const res = await updateSession(makeRequest("/login"));
    expect(res.status).toBeLessThan(300);
  });

  it("permite acesso a /register sem autenticação", async () => {
    const res = await updateSession(makeRequest("/register"));
    expect(res.status).toBeLessThan(300);
  });

  it("permite acesso a /rankings sem autenticação", async () => {
    const res = await updateSession(makeRequest("/rankings"));
    expect(res.status).toBeLessThan(300);
  });
});

// ---------------------------------------------------------------------------
// ROLE INSUFICIENTE — PÁGINAS
// ---------------------------------------------------------------------------
describe("role insuficiente em páginas", () => {
  it("redireciona player que tenta acessar /admin para /unauthorized", async () => {
    asAuthenticatedUser(["player"]);
    const res = await updateSession(makeRequest("/admin"));
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.headers.get("location")).toContain("/unauthorized");
  });

  it("redireciona player que tenta acessar /moderation para /unauthorized", async () => {
    asAuthenticatedUser(["player"]);
    const res = await updateSession(makeRequest("/moderation"));
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.headers.get("location")).toContain("/unauthorized");
  });

  it("redireciona player que tenta acessar /matchmaking para /unauthorized", async () => {
    asAuthenticatedUser(["player"]);
    const res = await updateSession(makeRequest("/matchmaking"));
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.headers.get("location")).toContain("/unauthorized");
  });

  it("redireciona usuário inativo (mesmo com role correta) para /unauthorized", async () => {
    asAuthenticatedUser(["admin"], false); // isActive = false
    const res = await updateSession(makeRequest("/admin"));
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.headers.get("location")).toContain("/unauthorized");
  });
});

// ---------------------------------------------------------------------------
// ROLE INSUFICIENTE — APIs
// ---------------------------------------------------------------------------
describe("role insuficiente em rotas de API", () => {
  it("retorna 403 JSON (não redireciona) para player acessando /api/tournament/create", async () => {
    asAuthenticatedUser(["player"]);
    const res = await updateSession(makeRequest("/api/tournament/create"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: "forbidden" });
  });

  it("retorna 403 JSON para player acessando /api/claim/review (exige moderator/admin)", async () => {
    asAuthenticatedUser(["player"]);
    const res = await updateSession(makeRequest("/api/claim/review"));
    expect(res.status).toBe(403);
  });

  it("retorna 403 JSON para player acessando /api/matchmaking/queue", async () => {
    asAuthenticatedUser(["player"]);
    const res = await updateSession(makeRequest("/api/matchmaking/queue"));
    expect(res.status).toBe(403);
  });

  it("retorna 403 JSON para manager acessando /api/tournament/create", async () => {
    asAuthenticatedUser(["manager"]);
    const res = await updateSession(makeRequest("/api/tournament/create"));
    expect(res.status).toBe(403);
  });

  it("retorna 403 JSON para usuário inativo acessando API protegida", async () => {
    asAuthenticatedUser(["admin"], false);
    const res = await updateSession(makeRequest("/api/tournament/create"));
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// ACESSO AUTORIZADO — usuário com role correta passa
// ---------------------------------------------------------------------------
describe("acesso autorizado", () => {
  it("permite admin acessar /admin", async () => {
    asAuthenticatedUser(["admin"]);
    const res = await updateSession(makeRequest("/admin"));
    expect(res.status).toBeLessThan(300);
  });

  it("permite moderator acessar /moderation", async () => {
    asAuthenticatedUser(["moderator"]);
    const res = await updateSession(makeRequest("/moderation"));
    expect(res.status).toBeLessThan(300);
  });

  it("permite player acessar /profile", async () => {
    asAuthenticatedUser(["player"]);
    const res = await updateSession(makeRequest("/profile"));
    expect(res.status).toBeLessThan(300);
  });

  it("permite manager acessar /team", async () => {
    asAuthenticatedUser(["manager"]);
    const res = await updateSession(makeRequest("/team"));
    expect(res.status).toBeLessThan(300);
  });

  it("permite moderator acessar /team (roles acumulativos)", async () => {
    asAuthenticatedUser(["moderator"]);
    const res = await updateSession(makeRequest("/team"));
    expect(res.status).toBeLessThan(300);
  });

  it("permite moderator acessar /api/tournament/create (rota de criação)", async () => {
    asAuthenticatedUser(["moderator"]);
    const res = await updateSession(makeRequest("/api/tournament/create"));
    expect(res.status).toBeLessThan(300);
  });

  it("permite manager acessar /matchmaking", async () => {
    asAuthenticatedUser(["manager"]);
    const res = await updateSession(makeRequest("/matchmaking"));
    expect(res.status).toBeLessThan(300);
  });

  it("permite manager acessar /api/tournament/enroll", async () => {
    asAuthenticatedUser(["manager"]);
    const res = await updateSession(makeRequest("/api/tournament/enroll"));
    expect(res.status).toBeLessThan(300);
  });

  it("passa /api/ea/fetch-matches sem verificar role quando autenticado (sem restrição de role)", async () => {
    // Com autenticação mas sem roles específicas — /api/ea/fetch-matches não exige role
    asAuthenticatedUser(["player"]);
    const res = await updateSession(makeRequest("/api/ea/fetch-matches"));
    // Não deve retornar 403 (não exige role específica)
    expect(res.status).not.toBe(403);
    expect(res.status).toBeLessThan(300);
  });

  it("permite acesso usando fallback por email quando perfil por id não é encontrado", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "auth-id-sem-perfil", email: "admin@example.com" } },
    });
    mockMaybeSingle
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: { id: "perfil-antigo", roles: ["admin"], is_active: true } });

    const res = await updateSession(makeRequest("/moderation"));
    expect(res.status).toBeLessThan(300);
  });
});
