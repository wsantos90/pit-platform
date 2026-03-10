import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const {
  mockCreateAdminClient,
  mockParseMatches,
  mockLoadMatchClassificationContext,
  mockPersistMatchesForClub,
} = vi.hoisted(() => ({
  mockCreateAdminClient: vi.fn(),
  mockParseMatches: vi.fn(),
  mockLoadMatchClassificationContext: vi.fn(),
  mockPersistMatchesForClub: vi.fn(),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mockCreateAdminClient,
}))

vi.mock("@/lib/ea/parser", () => ({
  parseMatches: mockParseMatches,
}))

vi.mock("@/lib/collect/loadMatchClassificationContext", () => ({
  loadMatchClassificationContext: mockLoadMatchClassificationContext,
}))

vi.mock("@/lib/collect/persistMatches", () => ({
  persistMatchesForClub: mockPersistMatchesForClub,
}))

import { POST } from "@/app/api/collect/tournament-run/[runId]/ingest/route"

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/collect/tournament-run/run-1/ingest", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-collect-token": "token-123",
    },
    body: JSON.stringify(body),
  })
}

function makeAdminClient() {
  const runMaybeSingle = vi.fn().mockResolvedValue({
    data: {
      id: "run-1",
      status: "running",
      clubs_total: 1,
      clubs_processed: 0,
      clubs_failed: 0,
      matches_new: 0,
      matches_skipped: 0,
      collect_token: "token-123",
      collect_token_expires_at: new Date(Date.now() + 60_000).toISOString(),
      target_ea_club_ids: ["123", "456"],
    },
    error: null,
  })
  const runEq = vi.fn().mockReturnValue({
    maybeSingle: runMaybeSingle,
  })
  const runSelect = vi.fn().mockReturnValue({
    eq: runEq,
  })

  const runUpdateEq = vi.fn().mockResolvedValue({ data: null, error: null })
  const runUpdate = vi.fn().mockReturnValue({
    eq: runUpdateEq,
  })

  const clubsUpdateEq = vi.fn().mockResolvedValue({ data: null, error: null })
  const clubsUpdate = vi.fn().mockReturnValue({
    eq: clubsUpdateEq,
  })

  return {
    from: vi.fn((table: string) => {
      if (table === "collect_runs") {
        return {
          select: runSelect,
          update: runUpdate,
        }
      }

      if (table === "clubs") {
        return {
          update: clubsUpdate,
        }
      }

      return {}
    }),
  }
}

describe("POST /api/collect/tournament-run/[runId]/ingest", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockParseMatches.mockReturnValue([])
    mockLoadMatchClassificationContext.mockResolvedValue({
      tournamentPairs: {},
      matchmakingPairs: {},
    })
  })

  it("usa o helper compartilhado de classificacao por pares no ingest", async () => {
    const adminClient = makeAdminClient()
    const matches: unknown[] = []
    const classificationContext = {
      tournamentPairs: {
        "123::456": {
          tournamentId: "t-1",
          tournamentRound: "final",
        },
      },
      matchmakingPairs: {},
    }

    mockCreateAdminClient.mockReturnValue(adminClient)
    mockParseMatches.mockReturnValue(matches)
    mockLoadMatchClassificationContext.mockResolvedValue(classificationContext)
    mockPersistMatchesForClub.mockResolvedValue({
      matchesNew: 1,
      matchesSkipped: 0,
      playersLinked: 2,
    })

    const response = await POST(makeRequest({ ea_club_id: "123", success: true, raw_data: [] }), {
      params: Promise.resolve({ runId: "run-1" }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ ok: true, matches_new: 1, matches_skipped: 0 })
    expect(mockLoadMatchClassificationContext).toHaveBeenCalledWith(adminClient, {
      targetEaClubIds: ["123", "456"],
    })
    expect(mockPersistMatchesForClub).toHaveBeenCalledWith("123", matches, adminClient, classificationContext)
  })
})


