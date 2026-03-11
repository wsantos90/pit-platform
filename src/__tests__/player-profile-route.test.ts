import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

import { PATCH } from "@/app/api/player/profile/route";

function makePatchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/player/profile", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeServerClient(options?: {
  userId?: string | null;
  existingPlayer?: { id: string } | null;
  lookupError?: { message: string } | null;
  updatedPlayer?: {
    id: string;
    ea_gamertag: string;
    primary_position: string;
    secondary_position: string | null;
  } | null;
  writeError?: { code?: string; message?: string } | null;
}) {
  const lookupMaybeSingle = vi.fn().mockResolvedValue({
    data: options?.existingPlayer ?? null,
    error: options?.lookupError ?? null,
  });
  const lookupEq = vi.fn().mockReturnValue({ maybeSingle: lookupMaybeSingle });
  const lookupSelect = vi.fn().mockReturnValue({ eq: lookupEq });

  const writeMaybeSingle = vi.fn().mockResolvedValue({
    data: options?.updatedPlayer ?? null,
    error: options?.writeError ?? null,
  });
  const writeSelect = vi.fn().mockReturnValue({ maybeSingle: writeMaybeSingle });
  const writeEq = vi.fn().mockReturnValue({ select: writeSelect });
  const update = vi.fn().mockReturnValue({ eq: writeEq });

  const insertSingle = vi.fn().mockResolvedValue({
    data: options?.updatedPlayer ?? null,
    error: options?.writeError ?? null,
  });
  const insertSelect = vi.fn().mockReturnValue({ single: insertSingle });
  const insert = vi.fn().mockReturnValue({ select: insertSelect });

  const userEq = vi.fn().mockResolvedValue({ data: null, error: null });
  const userUpdate = vi.fn().mockReturnValue({ eq: userEq });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: options?.userId ? { id: options.userId } : null,
        },
      }),
      updateUser: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    from: vi.fn((table: string) => {
      if (table === "players") {
        return {
          select: lookupSelect,
          update,
          insert,
        };
      }

      if (table === "users") {
        return {
          update: userUpdate,
        };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
    __mocks: {
      lookupSelect,
      lookupEq,
      lookupMaybeSingle,
      update,
      writeEq,
      writeSelect,
      writeMaybeSingle,
      insert,
      insertSelect,
      insertSingle,
      userUpdate,
      userEq,
    },
  };
}

describe("PATCH /api/player/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 401 quando nao autenticado", async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ userId: null }));

    const response = await PATCH(makePatchRequest({ ea_gamertag: "PitPlayer" }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("unauthorized");
  });

  it("retorna 400 para payload invalido", async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ userId: "user-1" }));

    const response = await PATCH(makePatchRequest({ ea_gamertag: "ab" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_payload");
  });

  it("cria perfil de jogador quando ainda nao existe", async () => {
    const client = makeServerClient({
      userId: "user-1",
      existingPlayer: null,
      updatedPlayer: {
        id: "player-1",
        ea_gamertag: "NovoCraque",
        primary_position: "MC",
        secondary_position: null,
      },
    });
    mockCreateClient.mockResolvedValue(client);

    const response = await PATCH(makePatchRequest({ ea_gamertag: "NovoCraque" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(client.__mocks.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      ea_gamertag: "NovoCraque",
      primary_position: "MC",
    });
    expect(body.ea_gamertag).toBe("NovoCraque");
  });

  it("atualiza a gamertag quando o perfil ja existe", async () => {
    const client = makeServerClient({
      userId: "user-1",
      existingPlayer: { id: "player-1" },
      updatedPlayer: {
        id: "player-1",
        ea_gamertag: "CraqueAtualizado",
        primary_position: "VOL",
        secondary_position: "MC",
      },
    });
    mockCreateClient.mockResolvedValue(client);

    const response = await PATCH(makePatchRequest({ ea_gamertag: "CraqueAtualizado" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(client.__mocks.update).toHaveBeenCalledWith({ ea_gamertag: "CraqueAtualizado" });
    expect(body.primary_position).toBe("VOL");
    expect(body.secondary_position).toBe("MC");
  });

  it("retorna 409 quando a gamertag ja esta em uso", async () => {
    mockCreateClient.mockResolvedValue(
      makeServerClient({
        userId: "user-1",
        existingPlayer: { id: "player-1" },
        writeError: { code: "23505", message: "duplicate key value" },
      })
    );

    const response = await PATCH(makePatchRequest({ ea_gamertag: "Duplicada" }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("gamertag_already_in_use");
  });

  it("retorna 500 quando falha ao carregar o perfil atual", async () => {
    mockCreateClient.mockResolvedValue(
      makeServerClient({
        userId: "user-1",
        lookupError: { message: "db fail" },
      })
    );

    const response = await PATCH(makePatchRequest({ ea_gamertag: "PitPlayer" }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("failed_to_load_player_profile");
  });
});
