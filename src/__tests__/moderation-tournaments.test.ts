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

import { GET as getTournaments, POST as createTournament } from "@/app/api/moderation/tournaments/route";
import { PATCH as patchTournamentStatus } from "@/app/api/moderation/tournaments/[id]/route";
import { POST as generateBracket } from "@/app/api/moderation/tournaments/[id]/bracket/route";

const moderatorId = "11111111-1111-4111-8111-111111111111";
const tournamentId = "22222222-2222-4222-8222-222222222222";

function makeServerClient(options?: { userId?: string | null; roles?: string[]; isActive?: boolean }) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: {
      id: options?.userId ?? moderatorId,
      email: "moderator@example.com",
      roles: options?.roles ?? ["moderator"],
      is_active: options?.isActive ?? true,
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
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: options?.userId === null ? null : { id: options?.userId ?? moderatorId, email: "moderator@example.com" },
        },
      }),
    },
    from,
  };
}

function makeTournamentsGetRequest(status = "all") {
  return new NextRequest(`http://localhost/api/moderation/tournaments?status=${status}`, {
    method: "GET",
  });
}

describe("Moderation tournaments APIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/moderation/tournaments returns 401 when not authenticated", async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ userId: null }));
    mockCreateAdminClient.mockReturnValue({});

    const response = await getTournaments(makeTournamentsGetRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("GET /api/moderation/tournaments returns list with entries count", async () => {
    mockCreateClient.mockResolvedValue(makeServerClient());

    const tournamentsQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
    } as Record<string, ReturnType<typeof vi.fn>>;
    tournamentsQuery.select = vi.fn().mockReturnValue(tournamentsQuery);
    tournamentsQuery.eq = vi.fn().mockReturnValue(tournamentsQuery);
    tournamentsQuery.order = vi.fn().mockReturnValue(tournamentsQuery);
    tournamentsQuery.limit = vi.fn().mockResolvedValue({
      data: [
        {
          id: tournamentId,
          name: "Corujao Teste",
          type: "corujao",
          format: "single_elimination",
          status: "draft",
          capacity_min: 8,
          capacity_max: 32,
          group_count: null,
          scheduled_date: "2026-03-08",
          start_time: "22:00:00",
          entry_fee: 3,
          current_round: null,
          created_by: moderatorId,
          created_at: "2026-03-01T00:00:00.000Z",
          updated_at: "2026-03-01T00:00:00.000Z",
        },
      ],
      error: null,
    });

    const adminClient = {
      from: vi.fn((table: string) => {
        if (table === "tournaments") return tournamentsQuery;
        if (table === "tournament_entries") {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  { tournament_id: tournamentId, payment_status: "paid" },
                  { tournament_id: tournamentId, payment_status: "pending" },
                ],
                error: null,
              }),
            }),
          };
        }
        return {};
      }),
    };
    mockCreateAdminClient.mockReturnValue(adminClient);

    const response = await getTournaments(makeTournamentsGetRequest("draft"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tournaments).toHaveLength(1);
    expect(body.tournaments[0].entries_count).toBe(2);
    expect(body.tournaments[0].paid_entries_count).toBe(1);
    expect(tournamentsQuery.eq).toHaveBeenCalledWith("status", "draft");
  });

  it("POST /api/moderation/tournaments creates tournament", async () => {
    mockCreateClient.mockResolvedValue(makeServerClient());

    const adminClient = {
      from: vi.fn((table: string) => {
        if (table === "tournaments") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: tournamentId,
                    name: "Corujao de Sexta",
                    type: "corujao",
                    format: "single_elimination",
                    status: "draft",
                    capacity_min: 8,
                    capacity_max: 32,
                    group_count: null,
                    scheduled_date: "2026-03-08",
                    start_time: "22:00",
                    entry_fee: 3,
                    current_round: null,
                    created_by: moderatorId,
                    created_at: "2026-03-01T00:00:00.000Z",
                    updated_at: "2026-03-01T00:00:00.000Z",
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    };
    mockCreateAdminClient.mockReturnValue(adminClient);

    const response = await createTournament(
      new NextRequest("http://localhost/api/moderation/tournaments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Corujao de Sexta",
          type: "corujao",
          format: "single_elimination",
          capacity_min: 8,
          capacity_max: 32,
          scheduled_date: "2026-03-08",
          start_time: "22:00",
          entry_fee: 3,
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.tournament.id).toBe(tournamentId);
  });

  it("PATCH /api/moderation/tournaments/[id] blocks invalid status transition", async () => {
    mockCreateClient.mockResolvedValue(makeServerClient());

    const adminClient = {
      from: vi.fn((table: string) => {
        if (table === "tournaments") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: tournamentId, status: "finished", current_round: "final" },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    };
    mockCreateAdminClient.mockReturnValue(adminClient);

    const response = await patchTournamentStatus(
      new NextRequest(`http://localhost/api/moderation/tournaments/${tournamentId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "open" }),
      }),
      { params: Promise.resolve({ id: tournamentId }) }
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("invalid_transition");
  });

  it("PATCH /api/moderation/tournaments/[id] blocks finish when there are pending matches", async () => {
    mockCreateClient.mockResolvedValue(makeServerClient());

    const adminClient = {
      from: vi.fn((table: string) => {
        if (table === "tournaments") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: tournamentId, status: "in_progress", current_round: "semi_final" },
                  error: null,
                }),
              }),
            }),
            update: vi.fn(),
          };
        }

        if (table === "tournament_brackets") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [
                      { round: "semi_final", round_order: 2, status: "completed" },
                      { round: "final", round_order: 3, status: "scheduled" },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }

        return {};
      }),
    };
    mockCreateAdminClient.mockReturnValue(adminClient);

    const response = await patchTournamentStatus(
      new NextRequest(`http://localhost/api/moderation/tournaments/${tournamentId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "finished" }),
      }),
      { params: Promise.resolve({ id: tournamentId }) }
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("tournament_has_pending_matches");
  });

  it("PATCH /api/moderation/tournaments/[id] sets current_round to final when finishing completed bracket", async () => {
    mockCreateClient.mockResolvedValue(makeServerClient());

    const adminClient = {
      from: vi.fn((table: string) => {
        if (table === "tournaments") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: tournamentId, status: "in_progress", current_round: "semi_final" },
                  error: null,
                }),
              }),
            }),
            update: vi.fn((payload: Record<string, unknown>) => ({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: tournamentId,
                      name: "Corujao Teste",
                      type: "corujao",
                      format: "single_elimination",
                      status: payload.status,
                      capacity_min: 8,
                      capacity_max: 32,
                      group_count: null,
                      scheduled_date: "2026-03-08",
                      start_time: "22:00:00",
                      entry_fee: 3,
                      current_round: payload.current_round,
                      created_by: moderatorId,
                      created_at: "2026-03-01T00:00:00.000Z",
                      updated_at: "2026-03-01T00:00:00.000Z",
                    },
                    error: null,
                  }),
                }),
              }),
            })),
          };
        }

        if (table === "tournament_brackets") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [
                      { round: "quarter_final", round_order: 1, status: "completed" },
                      { round: "semi_final", round_order: 2, status: "completed" },
                      { round: "final", round_order: 3, status: "completed" },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }

        return {};
      }),
    };
    mockCreateAdminClient.mockReturnValue(adminClient);

    const response = await patchTournamentStatus(
      new NextRequest(`http://localhost/api/moderation/tournaments/${tournamentId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "finished" }),
      }),
      { params: Promise.resolve({ id: tournamentId }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tournament.current_round).toBe("final");
  });

  it("POST /api/moderation/tournaments/[id]/bracket generates bracket rows", async () => {
    mockCreateClient.mockResolvedValue(makeServerClient());

    const bracketsInsert = vi.fn().mockResolvedValue({ error: null });
    const tournamentUpdate = vi.fn().mockResolvedValue({ error: null });

    let bracketSelectCalls = 0;
    const adminClient = {
      from: vi.fn((table: string) => {
        if (table === "tournaments") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: tournamentId, format: "single_elimination", status: "open", group_count: null },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: tournamentUpdate,
            }),
          };
        }

        if (table === "tournament_brackets") {
          bracketSelectCalls += 1;
          if (bracketSelectCalls === 1) {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
              insert: bracketsInsert,
            };
          }
          return {
            insert: bracketsInsert,
          };
        }

        if (table === "tournament_entries") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: "33333333-3333-4333-8333-333333333331",
                      club_id: "44444444-4444-4444-8444-444444444441",
                      seed: 1,
                      created_at: "2026-03-01T00:00:00.000Z",
                      payment_status: "paid",
                    },
                    {
                      id: "33333333-3333-4333-8333-333333333332",
                      club_id: "44444444-4444-4444-8444-444444444442",
                      seed: 2,
                      created_at: "2026-03-01T00:01:00.000Z",
                      payment_status: "paid",
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }

        return {};
      }),
    };
    mockCreateAdminClient.mockReturnValue(adminClient);

    const response = await generateBracket(
      new NextRequest(`http://localhost/api/moderation/tournaments/${tournamentId}/bracket`, {
        method: "POST",
      }),
      { params: Promise.resolve({ id: tournamentId }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.created_brackets).toBeGreaterThan(0);
    expect(bracketsInsert).toHaveBeenCalledTimes(1);
    expect(tournamentUpdate).toHaveBeenCalledWith("id", tournamentId);
  });

  it("POST /api/moderation/tournaments/[id]/bracket generates 7 matches for 8 teams", async () => {
    mockCreateClient.mockResolvedValue(makeServerClient());

    const bracketsInsert = vi.fn().mockResolvedValue({ error: null });
    const tournamentUpdate = vi.fn().mockResolvedValue({ error: null });

    const entries = Array.from({ length: 8 }).map((_, index) => ({
      id: `33333333-3333-4333-8333-33333333333${index + 1}`,
      club_id: `44444444-4444-4444-8444-44444444444${index + 1}`,
      seed: index + 1,
      created_at: `2026-03-01T00:0${index}:00.000Z`,
      payment_status: "paid",
    }));

    const adminClient = {
      from: vi.fn((table: string) => {
        if (table === "tournaments") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: tournamentId, format: "single_elimination", status: "open", group_count: null },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: tournamentUpdate,
            }),
          };
        }

        if (table === "tournament_brackets") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
            insert: bracketsInsert,
          };
        }

        if (table === "tournament_entries") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: entries,
                  error: null,
                }),
              }),
            }),
          };
        }

        return {};
      }),
    };
    mockCreateAdminClient.mockReturnValue(adminClient);

    const response = await generateBracket(
      new NextRequest(`http://localhost/api/moderation/tournaments/${tournamentId}/bracket`, {
        method: "POST",
      }),
      { params: Promise.resolve({ id: tournamentId }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.created_brackets).toBe(7);
    expect(bracketsInsert).toHaveBeenCalledTimes(1);
  });
});
