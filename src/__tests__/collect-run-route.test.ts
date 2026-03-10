import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const {
  mockCreateClient,
  mockCreateAdminClient,
  mockFetchMatches,
  mockTryFetchAkamaiCookies,
  mockParseMatches,
  mockLoadManagerCollectContext,
  mockLoadMatchClassificationContext,
  mockPersistMatchesForClub,
} = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockCreateAdminClient: vi.fn(),
  mockFetchMatches: vi.fn(),
  mockTryFetchAkamaiCookies: vi.fn(),
  mockParseMatches: vi.fn(),
  mockLoadManagerCollectContext: vi.fn(),
  mockLoadMatchClassificationContext: vi.fn(),
  mockPersistMatchesForClub: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mockCreateAdminClient,
}))

vi.mock("@/lib/ea/api", () => ({
  fetchMatches: mockFetchMatches,
}))

vi.mock("@/lib/ea/cookieClient", () => ({
  tryFetchAkamaiCookies: mockTryFetchAkamaiCookies,
}))

vi.mock("@/lib/ea/parser", () => ({
  parseMatches: mockParseMatches,
}))

vi.mock("@/lib/collect/managerClub", () => ({
  loadManagerCollectContext: mockLoadManagerCollectContext,
}))

vi.mock("@/lib/collect/loadMatchClassificationContext", () => ({
  loadMatchClassificationContext: mockLoadMatchClassificationContext,
}))

vi.mock("@/lib/collect/persistMatches", () => ({
  persistMatchesForClub: mockPersistMatchesForClub,
}))

import { POST } from "@/app/api/collect/run/route"

function makeRequest(body?: unknown) {
  return new NextRequest("http://localhost/api/collect/run", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  })
}

function makeServerClient(userId: string | null = "manager-1") {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user:
            userId === null
              ? null
              : {
                  id: userId,
                  email: "manager@example.com",
                },
        },
      }),
    },
  }
}

function makeAdminClient() {
  const runInsertSingle = vi.fn().mockResolvedValue({
    data: { id: "run-1" },
    error: null,
  })
  const runInsert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: runInsertSingle,
    }),
  })

  const runUpdateEq = vi.fn().mockResolvedValue({
    data: null,
    error: null,
  })
  const runUpdate = vi.fn().mockReturnValue({
    eq: runUpdateEq,
  })

  const clubsUpdateEq = vi.fn().mockResolvedValue({
    data: null,
    error: null,
  })
  const clubsUpdate = vi.fn().mockReturnValue({
    eq: clubsUpdateEq,
  })

  return {
    from: vi.fn((table: string) => {
      if (table === "collect_runs") {
        return {
          insert: runInsert,
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

describe("POST /api/collect/run", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateClient.mockResolvedValue(makeServerClient())
    mockTryFetchAkamaiCookies.mockResolvedValue(null)
    mockLoadManagerCollectContext.mockResolvedValue({
      canCollect: true,
      managedClub: {
        ea_club_id: "123",
        display_name: "Pit FC",
        last_scanned_at: null,
      },
      managedClubError: null,
    })
    mockLoadMatchClassificationContext.mockResolvedValue({
      tournamentPairs: {},
      matchmakingPairs: {},
    })
    mockParseMatches.mockReturnValue([])
    mockPersistMatchesForClub.mockResolvedValue({
      matchesNew: 2,
      matchesSkipped: 1,
      playersLinked: 4,
    })
  })

  it("retorna 401 quando nao autenticado", async () => {
    mockCreateClient.mockResolvedValue(makeServerClient(null))

    const response = await POST(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("Unauthorized")
  })

  it("retorna 429 quando clube esta em cooldown backend", async () => {
    mockLoadManagerCollectContext.mockResolvedValue({
      canCollect: true,
      managedClub: {
        ea_club_id: "123",
        display_name: "Pit FC",
        last_scanned_at: new Date().toISOString(),
      },
      managedClubError: null,
    })

    const response = await POST(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(body.error).toBe("rate_limited")
    expect(typeof body.retry_after_seconds).toBe("number")
  })

  it("executa coleta manual via servidor e retorna o modo usado", async () => {
    const adminClient = makeAdminClient()
    const classificationContext = {
      tournamentPairs: {
        "123::456": {
          tournamentId: "t-1",
          tournamentRound: "semi_final",
        },
      },
      matchmakingPairs: {},
    }

    mockCreateAdminClient.mockReturnValue(adminClient)
    mockFetchMatches.mockResolvedValue([] as never)
    mockLoadMatchClassificationContext.mockResolvedValue(classificationContext)

    const response = await POST(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      run_id: "run-1",
      mode: "server",
      matches_new: 2,
      matches_skipped: 1,
      players_linked: 4,
    })
    expect(mockFetchMatches).toHaveBeenCalledWith("123", undefined)
    expect(mockLoadMatchClassificationContext).toHaveBeenCalledWith(adminClient)
    expect(mockPersistMatchesForClub).toHaveBeenCalledWith("123", [], adminClient, classificationContext)
  })

  it("executa coleta via extensao local quando raw_data e enviado", async () => {
    const adminClient = makeAdminClient()
    const rawData = [{ matchId: "ea-1" }]
    const parsedMatches = [] as unknown[]

    mockCreateAdminClient.mockReturnValue(adminClient)
    mockParseMatches.mockReturnValue(parsedMatches)

    const response = await POST(
      makeRequest({
        mode: "local_extension",
        ea_club_id: "123",
        raw_data: rawData,
      })
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.mode).toBe("local_extension")
    expect(mockParseMatches).toHaveBeenCalledWith(rawData, "123")
    expect(mockFetchMatches).not.toHaveBeenCalled()
    expect(mockPersistMatchesForClub).toHaveBeenCalledWith("123", parsedMatches, adminClient, {
      tournamentPairs: {},
      matchmakingPairs: {},
    })
  })

  it("bloqueia coleta local quando o clube enviado nao pertence ao manager", async () => {
    const response = await POST(
      makeRequest({
        mode: "local_extension",
        ea_club_id: "999",
        raw_data: [],
      })
    )
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe("managed_club_mismatch")
  })
})
