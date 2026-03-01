import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { mockCreateClient, mockCreateAdminClient, mockRequireModeratorOrAdmin } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockCreateAdminClient: vi.fn(),
  mockRequireModeratorOrAdmin: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mockCreateAdminClient,
}));

vi.mock("@/app/api/moderation/_auth", () => ({
  requireModeratorOrAdmin: mockRequireModeratorOrAdmin,
}));

import { GET as getDisputes } from "@/app/api/moderation/disputes/route";
import { GET as getUsers } from "@/app/api/moderation/users/route";
import { PATCH as patchUser } from "@/app/api/moderation/users/[id]/route";

const moderatorAuth = {
  ok: true as const,
  user: {
    id: "11111111-1111-4111-8111-111111111111",
    email: "moderator@example.com",
  },
};

function unauthorizedAuth(status = 401) {
  return {
    ok: false as const,
    response: NextResponse.json({ error: "Unauthorized" }, { status }),
  };
}

describe("Moderation disputes/users APIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/moderation/disputes returns auth response when unauthorized", async () => {
    mockRequireModeratorOrAdmin.mockResolvedValue(unauthorizedAuth(401));
    const response = await getDisputes();
    expect(response.status).toBe(401);
  });

  it("GET /api/moderation/disputes returns joined disputes", async () => {
    mockRequireModeratorOrAdmin.mockResolvedValue(moderatorAuth);

    const disputesQuery = {
      select: vi.fn(),
      in: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
    } as Record<string, ReturnType<typeof vi.fn>>;
    disputesQuery.select = vi.fn().mockReturnValue(disputesQuery);
    disputesQuery.in = vi.fn().mockReturnValue(disputesQuery);
    disputesQuery.order = vi.fn().mockReturnValue(disputesQuery);
    disputesQuery.limit = vi.fn().mockResolvedValue({
      data: [
        {
          id: "d-1",
          bracket_id: "b-1",
          tournament_id: "t-1",
          filed_by_club: "c-1",
          filed_by_user: "u-1",
          against_club: "c-2",
          reason: "Missing opponent",
          status: "open",
          created_at: "2026-03-01T00:00:00.000Z",
        },
      ],
      error: null,
    });

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "disputes") return disputesQuery;
        if (table === "tournaments") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [{ id: "t-1", name: "Friday Cup" }], error: null }),
            }),
          };
        }
        if (table === "clubs") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi
                .fn()
                .mockResolvedValue({ data: [{ id: "c-1", display_name: "Club A" }, { id: "c-2", display_name: "Club B" }], error: null }),
            }),
          };
        }
        return {};
      }),
    };
    // adminClient handles users cross-user lookup in disputes route
    const adminClientForDisputes = {
      from: vi.fn((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi
                .fn()
                .mockResolvedValue({ data: [{ id: "u-1", display_name: "Mod User", email: "mod@example.com" }], error: null }),
            }),
          };
        }
        return {};
      }),
    };
    mockCreateClient.mockResolvedValue(supabase);
    mockCreateAdminClient.mockReturnValue(adminClientForDisputes);

    const response = await getDisputes();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.disputes).toHaveLength(1);
    expect(body.disputes[0].tournamentName).toBe("Friday Cup");
    expect(body.disputes[0].filedByClubName).toBe("Club A");
    expect(body.disputes[0].againstClubName).toBe("Club B");
  });

  it("GET /api/moderation/users validates limit", async () => {
    mockRequireModeratorOrAdmin.mockResolvedValue(moderatorAuth);
    mockCreateClient.mockResolvedValue({ from: vi.fn() });

    const response = await getUsers(
      new NextRequest("http://localhost/api/moderation/users?limit=0", { method: "GET" })
    );

    expect(response.status).toBe(400);
  });

  it("GET /api/moderation/users applies search and returns users", async () => {
    mockRequireModeratorOrAdmin.mockResolvedValue(moderatorAuth);

    const usersQuery = {
      select: vi.fn(),
      or: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
    } as Record<string, ReturnType<typeof vi.fn>>;
    usersQuery.select = vi.fn().mockReturnValue(usersQuery);
    usersQuery.or = vi.fn().mockReturnValue(usersQuery);
    usersQuery.order = vi.fn().mockReturnValue(usersQuery);
    usersQuery.limit = vi.fn().mockResolvedValue({
      data: [
        {
          id: "u-1",
          email: "user@example.com",
          display_name: "user",
          roles: ["player"],
          is_active: true,
          created_at: "2026-03-01T00:00:00.000Z",
        },
      ],
      error: null,
    });

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "users") return usersQuery;
        return {};
      }),
    };
    mockCreateClient.mockResolvedValue(supabase);

    const response = await getUsers(
      new NextRequest("http://localhost/api/moderation/users?q=user&limit=20", { method: "GET" })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.users).toHaveLength(1);
    expect(usersQuery.or).toHaveBeenCalledTimes(1);
  });

  it("PATCH /api/moderation/users/[id] blocks deactivating admin", async () => {
    mockRequireModeratorOrAdmin.mockResolvedValue(moderatorAuth);

    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "u-admin",
        email: "admin@example.com",
        display_name: "admin",
        roles: ["admin"],
        is_active: true,
        created_at: "2026-03-01T00:00:00.000Z",
      },
      error: null,
    });

    const adminClient = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle,
          }),
        }),
        update: vi.fn(),
      })),
    };
    mockCreateAdminClient.mockReturnValue(adminClient);

    const response = await patchUser(
      new NextRequest("http://localhost/api/moderation/users/u-admin", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ is_active: false }),
      }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111112" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("cannot_deactivate_admin");
  });

  it("PATCH /api/moderation/users/[id] updates user status", async () => {
    mockRequireModeratorOrAdmin.mockResolvedValue(moderatorAuth);

    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "u-player",
        email: "player@example.com",
        display_name: "player",
        roles: ["player"],
        is_active: true,
        created_at: "2026-03-01T00:00:00.000Z",
      },
      error: null,
    });

    const adminClient = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle,
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "u-player",
                  email: "player@example.com",
                  display_name: "player",
                  roles: ["player"],
                  is_active: false,
                  created_at: "2026-03-01T00:00:00.000Z",
                },
                error: null,
              }),
            }),
          }),
        }),
      })),
    };
    mockCreateAdminClient.mockReturnValue(adminClient);

    const response = await patchUser(
      new NextRequest("http://localhost/api/moderation/users/u-player", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ is_active: false }),
      }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111113" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user.is_active).toBe(false);
  });
});
