import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockCreateClient, mockCreateAdminClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockCreateAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mockCreateAdminClient,
}));

import { GET } from "@/app/api/moderation/claims/route";

function makeRequest(url = "http://localhost/api/moderation/claims") {
  return new NextRequest(url, { method: "GET" });
}

function makeClaimsQuery(claimsPayload: unknown[]) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  } as Record<string, unknown>;

  query.select = vi.fn().mockReturnValue(query);
  query.eq = vi.fn().mockReturnValue(query);
  query.order = vi.fn().mockReturnValue(query);
  query.limit = vi.fn().mockResolvedValue({
    data: claimsPayload,
    error: null,
  });

  return query as {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
  };
}

function makeServerClient(options?: {
  userId?: string | null;
  roles?: string[];
  isActive?: boolean;
  claims?: unknown[];
}) {
  const claimsQuery = makeClaimsQuery(options?.claims ?? []);
  const usersRoleMaybeSingle = vi.fn().mockResolvedValue({
    data: { roles: options?.roles ?? ["moderator"], is_active: options?.isActive ?? true },
  });

  const usersIn = vi.fn().mockResolvedValue({
    data: [{ id: "claimant-1", display_name: "claimant", email: "claimant@example.com" }],
  });
  const discoveredIn = vi.fn().mockResolvedValue({
    data: [{ id: "club-discovered-1", display_name: "Pit FC", ea_club_id: "31601", status: "pending" }],
  });

  const from = vi.fn((table: string) => {
    if (table === "claims") {
      return claimsQuery;
    }

    if (table === "users") {
      return {
        select: vi.fn((columns: string) => {
          if (columns.includes("roles")) {
            return {
              eq: vi.fn().mockReturnValue({
                maybeSingle: usersRoleMaybeSingle,
              }),
            };
          }
          return {
            in: usersIn,
          };
        }),
      };
    }

    if (table === "discovered_clubs") {
      return {
        select: vi.fn().mockReturnValue({
          in: discoveredIn,
        }),
      };
    }

    return {};
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: options?.userId
            ? { id: options.userId, email: "moderator@example.com" }
            : null,
        },
      }),
    },
    from,
    __mocks: { claimsQuery, usersRoleMaybeSingle, usersIn, discoveredIn },
  };
}

function makeAdminClient() {
  const createSignedUrl = vi.fn().mockResolvedValue({
    data: { signedUrl: "https://signed.example/photo.png" },
    error: null,
  });
  const storageFrom = vi.fn().mockReturnValue({ createSignedUrl });

  // adminClient.from() for cross-user DB lookups (users + discovered_clubs)
  const usersIn = vi.fn().mockResolvedValue({
    data: [{ id: "claimant-1", display_name: "claimant", email: "claimant@example.com" }],
    error: null,
  });
  const discoveredIn = vi.fn().mockResolvedValue({
    data: [{ id: "club-discovered-1", display_name: "Pit FC", ea_club_id: "31601", status: "pending" }],
    error: null,
  });

  const from = vi.fn((table: string) => {
    if (table === "users") {
      return { select: vi.fn().mockReturnValue({ in: usersIn }) };
    }
    if (table === "discovered_clubs") {
      return { select: vi.fn().mockReturnValue({ in: discoveredIn }) };
    }
    return {};
  });

  return {
    from,
    storage: { from: storageFrom },
    __mocks: { storageFrom, createSignedUrl, usersIn, discoveredIn },
  };
}

describe("GET /api/moderation/claims", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 401 quando não autenticado", async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ userId: null }));
    mockCreateAdminClient.mockReturnValue(makeAdminClient());

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("retorna 200 com lista de claims", async () => {
    mockCreateClient.mockResolvedValue(
      makeServerClient({
        userId: "moderator-1",
        claims: [
          {
            id: "claim-1",
            user_id: "claimant-1",
            discovered_club_id: "club-discovered-1",
            status: "pending",
            photo_url: "claim-proofs/claimant-1/photo.png",
            created_at: "2026-03-01T12:00:00.000Z",
            reviewed_at: null,
            reviewed_by: null,
            rejection_reason: null,
          },
        ],
      })
    );
    const adminClient = makeAdminClient();
    mockCreateAdminClient.mockReturnValue(adminClient);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(body.claims)).toBe(true);
    expect(body.claims[0].id).toBe("claim-1");
    expect(body.claims[0].photoSignedUrl).toBe("https://signed.example/photo.png");
    expect(adminClient.__mocks.createSignedUrl).toHaveBeenCalledTimes(1);
    expect(body.claims[0].claimant.displayName).toBe("claimant");
    expect(body.claims[0].claimant.email).toBe("claimant@example.com");
  });

  it("retorna 200 com filtro de status aplicado", async () => {
    const serverClient = makeServerClient({
      userId: "moderator-1",
      claims: [],
    });
    mockCreateClient.mockResolvedValue(serverClient);
    mockCreateAdminClient.mockReturnValue(makeAdminClient());

    const response = await GET(makeRequest("http://localhost/api/moderation/claims?status=approved"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.claims).toEqual([]);
    expect(serverClient.__mocks.claimsQuery.eq).toHaveBeenCalledWith("status", "approved");
  });
});
