import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { mockCreateAdminClient, mockRequireModeratorOrAdmin } = vi.hoisted(() => ({
  mockCreateAdminClient: vi.fn(),
  mockRequireModeratorOrAdmin: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mockCreateAdminClient,
}));

vi.mock("@/app/api/moderation/_auth", () => ({
  requireModeratorOrAdmin: mockRequireModeratorOrAdmin,
}));

import { PATCH } from "@/app/api/moderation/tournaments/[id]/bracket/[bracketId]/route";

const TOURNAMENT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BRACKET_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const NEXT_BRACKET_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const HOME_ENTRY_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const AWAY_ENTRY_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const HOME_CLUB_ID = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const AWAY_CLUB_ID = "11111111-1111-4111-8111-111111111111";

const moderatorAuth = {
  ok: true as const,
  user: { id: "22222222-2222-4222-8222-222222222222", email: "mod@example.com" },
};

function unauthorizedAuth(status = 401) {
  return {
    ok: false as const,
    response: NextResponse.json({ error: "Unauthorized" }, { status }),
  };
}

function makeRequest(payload: Record<string, unknown>) {
  return new NextRequest(
    `http://localhost/api/moderation/tournaments/${TOURNAMENT_ID}/bracket/${BRACKET_ID}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json" },
    }
  );
}

type AdminClientOptions = {
  tournament?: Record<string, unknown> | null;
  tournamentError?: { message: string } | null;
  bracket?: Record<string, unknown> | null;
  bracketError?: { message: string } | null;
  nextBracket?: Record<string, unknown> | null;
  nextBracketError?: { message: string } | null;
  updateBracketError?: { message: string } | null;
  advanceError?: { message: string } | null;
  updateEntriesError?: { message: string } | null;
  syncBrackets?: Array<{ round: string; round_order: number; status: string }>;
};

function makeAdminClient(options: AdminClientOptions = {}) {
  const defaultTournament = {
    id: TOURNAMENT_ID,
    format: "single_elimination",
    status: "in_progress",
  };
  const defaultBracket = {
    id: BRACKET_ID,
    tournament_id: TOURNAMENT_ID,
    round: "quarter_final",
    match_order: 1,
    status: "scheduled",
    home_entry_id: HOME_ENTRY_ID,
    away_entry_id: AWAY_ENTRY_ID,
    home_club_id: HOME_CLUB_ID,
    away_club_id: AWAY_CLUB_ID,
    next_bracket_id: options.nextBracket !== undefined ? NEXT_BRACKET_ID : null,
  };

  const updateBracket = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: options.updateBracketError ?? null }),
    }),
  });

  const updateNextBracket = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: options.advanceError ?? null }),
  });

  const updateEntries = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: options.updateEntriesError ?? null }),
    }),
  });

  const syncBracketsData = options.syncBrackets ?? [
    { round: "semi_final", round_order: 2, status: "scheduled" },
  ];

  // Track calls to differentiate between update bracket vs update next bracket vs update tournament
  let updateCallCount = 0;

  const from = vi.fn((table: string) => {
    if (table === "tournaments") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: options.tournament !== undefined ? options.tournament : defaultTournament,
              error: options.tournamentError ?? null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    }
    if (table === "tournament_brackets") {
      return {
        select: vi.fn((columns: string) => {
          // Distinguish between loading the bracket vs loading next bracket vs sync brackets
          if (columns.includes("round_order")) {
            // Sync query
            return {
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: syncBracketsData, error: null }),
                }),
              }),
            };
          }
          if (columns.includes("home_entry_id,away_entry_id") && !columns.includes("round")) {
            // Next bracket query
            return {
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: options.nextBracket ?? { id: NEXT_BRACKET_ID, home_entry_id: null, away_entry_id: null },
                  error: options.nextBracketError ?? null,
                }),
              }),
            };
          }
          // Main bracket query
          return {
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: options.bracket !== undefined ? options.bracket : defaultBracket,
                  error: options.bracketError ?? null,
                }),
              }),
            }),
          };
        }),
        update: vi.fn(() => {
          updateCallCount += 1;
          if (updateCallCount === 1) return updateBracket();
          return updateNextBracket();
        }),
      };
    }
    if (table === "tournament_entries") {
      return {
        update: vi.fn().mockReturnValue(updateEntries()),
      };
    }
    return {};
  });

  return {
    from,
    __mocks: { updateBracket, updateNextBracket, updateEntries },
  };
}

describe("PATCH /api/moderation/tournaments/[id]/bracket/[bracketId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 401 quando não autenticado", async () => {
    mockRequireModeratorOrAdmin.mockResolvedValue(unauthorizedAuth(401));
    const response = await PATCH(makeRequest({ homeScore: 2, awayScore: 1 }), {
      params: Promise.resolve({ id: TOURNAMENT_ID, bracketId: BRACKET_ID }),
    });
    expect(response.status).toBe(401);
  });

  it("retorna 400 para payload inválido (score negativo)", async () => {
    mockRequireModeratorOrAdmin.mockResolvedValue(moderatorAuth);
    mockCreateAdminClient.mockReturnValue(makeAdminClient());

    const response = await PATCH(makeRequest({ homeScore: -1, awayScore: 0 }), {
      params: Promise.resolve({ id: TOURNAMENT_ID, bracketId: BRACKET_ID }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("invalid_payload");
  });

  it("retorna 400 para payload inválido (score não-inteiro)", async () => {
    mockRequireModeratorOrAdmin.mockResolvedValue(moderatorAuth);
    mockCreateAdminClient.mockReturnValue(makeAdminClient());

    const response = await PATCH(makeRequest({ homeScore: "dois", awayScore: 1 }), {
      params: Promise.resolve({ id: TOURNAMENT_ID, bracketId: BRACKET_ID }),
    });

    expect(response.status).toBe(400);
  });

  it("retorna 404 quando torneio não encontrado", async () => {
    mockRequireModeratorOrAdmin.mockResolvedValue(moderatorAuth);
    mockCreateAdminClient.mockReturnValue(makeAdminClient({ tournament: null }));

    const response = await PATCH(makeRequest({ homeScore: 2, awayScore: 1 }), {
      params: Promise.resolve({ id: TOURNAMENT_ID, bracketId: BRACKET_ID }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("tournament_not_found");
  });

  it("retorna 404 quando bracket não encontrado", async () => {
    mockRequireModeratorOrAdmin.mockResolvedValue(moderatorAuth);
    mockCreateAdminClient.mockReturnValue(makeAdminClient({ bracket: null }));

    const response = await PATCH(makeRequest({ homeScore: 2, awayScore: 1 }), {
      params: Promise.resolve({ id: TOURNAMENT_ID, bracketId: BRACKET_ID }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("bracket_not_found");
  });

  it("retorna 409 quando bracket já está completo", async () => {
    mockRequireModeratorOrAdmin.mockResolvedValue(moderatorAuth);
    mockCreateAdminClient.mockReturnValue(
      makeAdminClient({
        bracket: {
          id: BRACKET_ID,
          tournament_id: TOURNAMENT_ID,
          round: "quarter_final",
          match_order: 1,
          status: "completed",
          home_entry_id: HOME_ENTRY_ID,
          away_entry_id: AWAY_ENTRY_ID,
          home_club_id: HOME_CLUB_ID,
          away_club_id: AWAY_CLUB_ID,
          next_bracket_id: null,
        },
      })
    );

    const response = await PATCH(makeRequest({ homeScore: 2, awayScore: 1 }), {
      params: Promise.resolve({ id: TOURNAMENT_ID, bracketId: BRACKET_ID }),
    });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("bracket_already_completed");
  });

  it("retorna 409 quando time está faltando no bracket", async () => {
    mockRequireModeratorOrAdmin.mockResolvedValue(moderatorAuth);
    mockCreateAdminClient.mockReturnValue(
      makeAdminClient({
        bracket: {
          id: BRACKET_ID,
          tournament_id: TOURNAMENT_ID,
          round: "quarter_final",
          match_order: 1,
          status: "scheduled",
          home_entry_id: HOME_ENTRY_ID,
          away_entry_id: null, // time faltando
          home_club_id: HOME_CLUB_ID,
          away_club_id: null,
          next_bracket_id: null,
        },
      })
    );

    const response = await PATCH(makeRequest({ homeScore: 2, awayScore: 1 }), {
      params: Promise.resolve({ id: TOURNAMENT_ID, bracketId: BRACKET_ID }),
    });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("bracket_missing_teams");
  });

  it("retorna 400 para empate em single_elimination", async () => {
    mockRequireModeratorOrAdmin.mockResolvedValue(moderatorAuth);
    mockCreateAdminClient.mockReturnValue(makeAdminClient());

    const response = await PATCH(makeRequest({ homeScore: 2, awayScore: 2 }), {
      params: Promise.resolve({ id: TOURNAMENT_ID, bracketId: BRACKET_ID }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("tie_not_allowed_for_format");
  });

  it("retorna 200 com resultado registrado e winner_entry_id correto (home vence)", async () => {
    mockRequireModeratorOrAdmin.mockResolvedValue(moderatorAuth);
    mockCreateAdminClient.mockReturnValue(makeAdminClient());

    const response = await PATCH(makeRequest({ homeScore: 3, awayScore: 1 }), {
      params: Promise.resolve({ id: TOURNAMENT_ID, bracketId: BRACKET_ID }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.winner_entry_id).toBe(HOME_ENTRY_ID);
    expect(body.tie).toBe(false);
  });

  it("retorna 200 com winner correto quando away vence", async () => {
    mockRequireModeratorOrAdmin.mockResolvedValue(moderatorAuth);
    mockCreateAdminClient.mockReturnValue(makeAdminClient());

    const response = await PATCH(makeRequest({ homeScore: 0, awayScore: 2 }), {
      params: Promise.resolve({ id: TOURNAMENT_ID, bracketId: BRACKET_ID }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.winner_entry_id).toBe(AWAY_ENTRY_ID);
    expect(body.tie).toBe(false);
  });

  it("aceita empate em round_robin e retorna tie=true", async () => {
    mockRequireModeratorOrAdmin.mockResolvedValue(moderatorAuth);
    mockCreateAdminClient.mockReturnValue(
      makeAdminClient({
        tournament: { id: TOURNAMENT_ID, format: "round_robin", status: "in_progress" },
        bracket: {
          id: BRACKET_ID,
          tournament_id: TOURNAMENT_ID,
          round: "round_robin",
          match_order: 1,
          status: "scheduled",
          home_entry_id: HOME_ENTRY_ID,
          away_entry_id: AWAY_ENTRY_ID,
          home_club_id: HOME_CLUB_ID,
          away_club_id: AWAY_CLUB_ID,
          next_bracket_id: null,
        },
        syncBrackets: [{ round: "round_robin", round_order: 1, status: "completed" }],
      })
    );

    const response = await PATCH(makeRequest({ homeScore: 1, awayScore: 1 }), {
      params: Promise.resolve({ id: TOURNAMENT_ID, bracketId: BRACKET_ID }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tie).toBe(true);
    expect(body.winner_entry_id).toBeNull();
  });
});
