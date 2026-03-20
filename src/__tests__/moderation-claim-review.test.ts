import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockCreateClient, mockCreateAdminClient, mockLoggerError } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockCreateAdminClient: vi.fn(),
  mockLoggerError: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mockCreateAdminClient,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: mockLoggerError,
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { POST } from "@/app/api/claim/review/route";

function makeRequest(payload: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/claim/review", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "content-type": "application/json" },
  });
}

function makeServerClient(options: { userId?: string | null; roles?: string[]; isActive?: boolean }) {
  const getUser = vi.fn().mockResolvedValue({
    data: {
      user: options.userId
        ? {
            id: options.userId,
            email: "moderator@example.com",
          }
        : null,
    },
  });

  const maybeSingle = vi.fn().mockResolvedValue({
    data: {
      roles: options.roles ?? ["moderator"],
      is_active: options.isActive ?? true,
      email: "moderator@example.com",
    },
  });

  const from = vi.fn((table: string) => {
    if (table === "users") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle,
          }),
        }),
      };
    }
    return {};
  });

  return {
    auth: { getUser },
    from,
    __mocks: { maybeSingle, getUser, from },
  };
}

function makeAdminClient(options?: {
  rpcData?: unknown;
  rpcError?: { message: string } | null;
  notificationError?: { message: string } | null;
}) {
  const rpc = vi.fn().mockResolvedValue({
    data: options?.rpcData ?? { club_id: "club-1", user_id: "claimant-1", club_name: "Pit FC" },
    error: options?.rpcError ?? null,
  });
  const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const notificationSingle = vi.fn().mockResolvedValue({
    data: options?.notificationError
      ? null
      : {
          id: "notif-1",
          user_id: "claimant-1",
          type: "claim_approved",
          title: "Reivindicacao aprovada",
          message: "Sua reivindicacao foi aprovada.",
          data: null,
          is_read: false,
          created_at: "2026-03-17T00:00:00.000Z",
        },
    error: options?.notificationError ?? null,
  });
  const notificationSelect = vi.fn().mockReturnValue({ single: notificationSingle });
  const insert = vi.fn().mockReturnValue({ select: notificationSelect });
  const from = vi.fn((table: string) => {
    if (table === "user_notification_prefs") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle,
            }),
          }),
        }),
      };
    }
    if (table === "notifications") {
      return { insert };
    }
    return {};
  });

  return {
    rpc,
    from,
    __mocks: { rpc, from, insert, maybeSingle, notificationSingle },
  };
}

describe("POST /api/claim/review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mantem review com sucesso mesmo se a notificacao falhar", async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ userId: "moderator-1" }));
    const adminClient = makeAdminClient({
      notificationError: { message: "insert failed" },
    });
    mockCreateAdminClient.mockReturnValue(adminClient);

    const response = await POST(
      makeRequest({ claimId: "11111111-1111-1111-1111-111111111111", action: "approve" })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockLoggerError).toHaveBeenCalledWith(
      "[Claim/Review] failed to notify claimant about approval",
      expect.objectContaining({
        claimId: "11111111-1111-1111-1111-111111111111",
        userId: "claimant-1",
        error: "insert failed",
      })
    );
  });

  it("retorna 401 quando não autenticado", async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ userId: null }));

    const response = await POST(
      makeRequest({ claimId: "11111111-1111-1111-1111-111111111111", action: "approve" })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("retorna 400 quando action=reject sem rejectionReason", async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ userId: "moderator-1" }));
    mockCreateAdminClient.mockReturnValue(makeAdminClient());

    const response = await POST(
      makeRequest({ claimId: "11111111-1111-1111-1111-111111111111", action: "reject" })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid payload");
  });

  it("mapeia claim_not_found para 404", async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ userId: "moderator-1" }));
    mockCreateAdminClient.mockReturnValue(
      makeAdminClient({ rpcError: { message: "claim_not_found" }, rpcData: null })
    );

    const response = await POST(
      makeRequest({ claimId: "11111111-1111-1111-1111-111111111111", action: "approve" })
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.code).toBe("claim_not_found");
  });

  it("mapeia claim_not_pending para 409", async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ userId: "moderator-1" }));
    mockCreateAdminClient.mockReturnValue(
      makeAdminClient({ rpcError: { message: "claim_not_pending" }, rpcData: null })
    );

    const response = await POST(
      makeRequest({ claimId: "11111111-1111-1111-1111-111111111111", action: "approve" })
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.code).toBe("claim_not_pending");
  });

  it("retorna 403 para role insuficiente (player)", async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ userId: "player-1", roles: ["player"] }));
    mockCreateAdminClient.mockReturnValue(makeAdminClient());

    const response = await POST(
      makeRequest({ claimId: "11111111-1111-1111-1111-111111111111", action: "approve" })
    );

    expect(response.status).toBe(403);
  });

  it("aprova claim com status 200", async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ userId: "moderator-1" }));
    const adminClient = makeAdminClient();
    mockCreateAdminClient.mockReturnValue(adminClient);

    const response = await POST(
      makeRequest({ claimId: "11111111-1111-1111-1111-111111111111", action: "approve" })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.clubId).toBe("club-1");
    expect(adminClient.__mocks.rpc).toHaveBeenCalledWith("fn_approve_claim", {
      p_claim_id: "11111111-1111-1111-1111-111111111111",
      p_reviewer_id: "moderator-1",
    });
  });

  it("rejeita claim com status 200", async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ userId: "moderator-1" }));
    const adminClient = makeAdminClient({
      rpcData: {
        user_id: "claimant-1",
        discovered_club_id: "22222222-2222-2222-2222-222222222222",
      },
    });
    mockCreateAdminClient.mockReturnValue(adminClient);

    const response = await POST(
      makeRequest({
        claimId: "11111111-1111-1111-1111-111111111111",
        action: "reject",
        rejectionReason: "Documento não comprova vínculo com o clube.",
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(adminClient.__mocks.rpc).toHaveBeenCalledWith("fn_reject_claim", {
      p_claim_id: "11111111-1111-1111-1111-111111111111",
      p_reviewer_id: "moderator-1",
      p_rejection_reason: "Documento não comprova vínculo com o clube.",
    });
  });
});
