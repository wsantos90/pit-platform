import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const {
  mockCreateClient,
  mockCreateAdminClient,
  mockFetchMatches,
  mockTryFetchAkamaiCookies,
  mockPersistMatchesForClub,
} = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockCreateAdminClient: vi.fn(),
  mockFetchMatches: vi.fn(),
  mockTryFetchAkamaiCookies: vi.fn(),
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

vi.mock("@/lib/collect/persistMatches", () => ({
  persistMatchesForClub: mockPersistMatchesForClub,
}))

import { POST } from "@/app/api/collect/run/route"

function makeRequest() {
  return new NextRequest("http://localhost/api/collect/run", {
    method: "POST",
  })
}

function makeServerClient(options?: {
  userId?: string | null
  roles?: string[]
  isActive?: boolean
  managedClub?: { ea_club_id: string; last_scanned_at: string | null } | null
  managedClubError?: { message: string } | null
}) {
  const userId = options && "userId" in options ? options.userId ?? null : "manager-1"
  const roles = options?.roles ?? ["manager"]
  const isActive = options?.isActive ?? true

  const usersByIdMaybeSingle = vi.fn().mockResolvedValue({
    data:
      userId === null
        ? null
        : {
            id: userId,
            email: "manager@example.com",
            roles,
            is_active: isActive,
          },
    error: null,
  })
  const usersByEmailMaybeSingle = vi.fn().mockResolvedValue({
    data: null,
    error: null,
  })

  const usersEq = vi.fn((column: string) => {
    if (column === "id") {
      return { maybeSingle: usersByIdMaybeSingle }
    }
    return { maybeSingle: usersByEmailMaybeSingle }
  })

  const clubsMaybeSingle = vi.fn().mockResolvedValue({
    data: options?.managedClub ?? { ea_club_id: "123", last_scanned_at: null },
    error: options?.managedClubError ?? null,
  })
  const clubsEqStatus = vi.fn().mockReturnValue({ maybeSingle: clubsMaybeSingle })
  const clubsEqManager = vi.fn().mockReturnValue({ eq: clubsEqStatus })

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
    from: vi.fn((table: string) => {
      if (table === "users") {
        return {
          select: vi.fn().mockReturnValue({
            eq: usersEq,
          }),
        }
      }

      if (table === "clubs") {
        return {
          select: vi.fn().mockReturnValue({
            eq: clubsEqManager,
          }),
        }
      }

      return {}
    }),
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
    mockTryFetchAkamaiCookies.mockResolvedValue(null)
  })

  it("retorna 401 quando nao autenticado", async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ userId: null }))

    const response = await POST(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("Unauthorized")
  })

  it("retorna 429 quando clube esta em cooldown backend", async () => {
    mockCreateClient.mockResolvedValue(
      makeServerClient({
        managedClub: {
          ea_club_id: "123",
          last_scanned_at: new Date().toISOString(),
        },
      })
    )

    const response = await POST(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(body.error).toBe("rate_limited")
    expect(typeof body.retry_after_seconds).toBe("number")
  })

  it("executa coleta manual para o clube do manager", async () => {
    mockCreateClient.mockResolvedValue(makeServerClient())
    mockCreateAdminClient.mockReturnValue(makeAdminClient())
    mockFetchMatches.mockResolvedValue([] as never)
    mockPersistMatchesForClub.mockResolvedValue({
      matchesNew: 2,
      matchesSkipped: 1,
      playersLinked: 4,
    })

    const response = await POST(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      run_id: "run-1",
      matches_new: 2,
      matches_skipped: 1,
      players_linked: 4,
    })
    expect(mockFetchMatches).toHaveBeenCalledWith("123", undefined)
    expect(mockPersistMatchesForClub).toHaveBeenCalledTimes(1)
  })
})
