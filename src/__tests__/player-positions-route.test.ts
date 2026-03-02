import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

import { PATCH } from "@/app/api/player/positions/route";

function makePatchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/player/positions", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeServerClient(options?: {
  userId?: string | null;
  updatedPlayer?: { primary_position: string; secondary_position: string | null } | null;
  updateError?: { message: string } | null;
}) {
  const maybySingle = vi.fn().mockResolvedValue({
    data: options?.updatedPlayer ?? null,
    error: options?.updateError ?? null,
  });
  const select = vi.fn().mockReturnValue({ maybeSingle: maybySingle });
  const eq = vi.fn().mockReturnValue({ select });
  const update = vi.fn().mockReturnValue({ eq });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: options?.userId ? { id: options.userId } : null,
        },
      }),
    },
    from: vi.fn(() => ({ update })),
    __mocks: { update, eq, select, maybySingle },
  };
}

describe("PATCH /api/player/positions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 401 quando nao autenticado", async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ userId: null }));

    const response = await PATCH(makePatchRequest({ primary_position: "MC", secondary_position: null }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("unauthorized");
  });

  it("retorna 400 para payload invalido", async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ userId: "player-1" }));

    const response = await PATCH(makePatchRequest({ primary_position: "INVALIDA" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_payload");
  });

  it("retorna 400 quando posicoes primaria e secundaria sao iguais", async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ userId: "player-1" }));

    const response = await PATCH(makePatchRequest({ primary_position: "VOL", secondary_position: "VOL" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("same_positions");
  });

  it("retorna 404 quando jogador nao existe", async () => {
    mockCreateClient.mockResolvedValue(
      makeServerClient({ userId: "player-1", updatedPlayer: null })
    );

    const response = await PATCH(makePatchRequest({ primary_position: "VOL", secondary_position: "ZAG" }));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("player_not_found");
  });

  it("retorna 500 quando update falha no banco", async () => {
    mockCreateClient.mockResolvedValue(
      makeServerClient({ userId: "player-1", updateError: { message: "db error" } })
    );

    const response = await PATCH(makePatchRequest({ primary_position: "GK", secondary_position: null }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("failed_to_update_player_positions");
  });

  it("retorna 200 com posicoes atualizadas (primaria + secundaria)", async () => {
    mockCreateClient.mockResolvedValue(
      makeServerClient({
        userId: "player-1",
        updatedPlayer: { primary_position: "VOL", secondary_position: "ZAG" },
      })
    );

    const response = await PATCH(makePatchRequest({ primary_position: "VOL", secondary_position: "ZAG" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.primary_position).toBe("VOL");
    expect(body.secondary_position).toBe("ZAG");
  });

  it("retorna 200 sem posicao secundaria (null)", async () => {
    mockCreateClient.mockResolvedValue(
      makeServerClient({
        userId: "player-1",
        updatedPlayer: { primary_position: "GK", secondary_position: null },
      })
    );

    const response = await PATCH(makePatchRequest({ primary_position: "GK", secondary_position: null }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.primary_position).toBe("GK");
    expect(body.secondary_position).toBeNull();
  });
});
