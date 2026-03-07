import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const {
  mockCreateAdminClient,
  mockFetchMatches,
  mockTryFetchAkamaiCookies,
  mockPersistMatchesForClub,
} = vi.hoisted(() => ({
  mockCreateAdminClient: vi.fn(),
  mockFetchMatches: vi.fn(),
  mockTryFetchAkamaiCookies: vi.fn(),
  mockPersistMatchesForClub: vi.fn(),
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

import { POST } from "@/app/api/cron/collect/route"

function makeRequest(secret: string) {
  return new NextRequest("http://localhost/api/cron/collect", {
    method: "POST",
    headers: {
      "x-cron-secret": secret,
    },
  })
}

function makeAdminClient() {
  const staleCleanupLt = vi.fn().mockResolvedValue({ data: null, error: null })

  const runInsertSingle = vi.fn().mockResolvedValue({
    data: { id: "run-1" },
    error: null,
  })
  const runInsert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: runInsertSingle,
    }),
  })

  const runUpdate = vi.fn().mockImplementation((_payload: Record<string, unknown>) => ({
    eq: vi.fn((column: string) => {
      if (column === "status") {
        return {
          lt: staleCleanupLt,
        }
      }

      return Promise.resolve({ data: null, error: null })
    }),
  }))

  const clubsStatusEq = vi.fn().mockResolvedValue({
    data: [{ ea_club_id: "100" }, { ea_club_id: "200" }],
    error: null,
  })
  const clubsSelect = vi.fn().mockReturnValue({
    eq: clubsStatusEq,
  })
  const clubsUpdateIn = vi.fn().mockResolvedValue({ data: null, error: null })
  const clubsUpdate = vi.fn().mockReturnValue({
    in: clubsUpdateIn,
  })

  const adminConfigIn = vi.fn().mockResolvedValue({
    data: [
      { key: "discovery_batch_size", value: 10 },
      { key: "discovery_rate_limit_ms", value: 1500 },
    ],
    error: null,
  })
  const adminConfigSelect = vi.fn().mockReturnValue({
    in: adminConfigIn,
  })

  return {
    from: vi.fn((table: string) => {
      if (table === "collect_runs") {
        return {
          update: runUpdate,
          insert: runInsert,
        }
      }

      if (table === "clubs") {
        return {
          select: clubsSelect,
          update: clubsUpdate,
        }
      }

      if (table === "admin_config") {
        return {
          select: adminConfigSelect,
        }
      }

      return {}
    }),
  }
}

describe("POST /api/cron/collect", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.N8N_WEBHOOK_SECRET = "task16-secret"
    mockTryFetchAkamaiCookies.mockResolvedValue(null)
  })

  it("retorna 401 quando secret e invalido", async () => {
    const response = await POST(makeRequest("invalid-secret"))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("Unauthorized")
  })

  it("processa clubes ativos e retorna metricas agregadas", async () => {
    mockCreateAdminClient.mockReturnValue(makeAdminClient())
    mockFetchMatches.mockResolvedValue([] as never)
    mockPersistMatchesForClub
      .mockResolvedValueOnce({ matchesNew: 2, matchesSkipped: 1, playersLinked: 0 })
      .mockResolvedValueOnce({ matchesNew: 1, matchesSkipped: 3, playersLinked: 0 })

    const response = await POST(makeRequest("task16-secret"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      run_id: "run-1",
      clubs_processed: 2,
      matches_new: 3,
      matches_skipped: 4,
      failed: 0,
      failures: [],
    })
    expect(mockFetchMatches).toHaveBeenNthCalledWith(1, "100", undefined)
    expect(mockFetchMatches).toHaveBeenNthCalledWith(2, "200", undefined)
    expect(mockPersistMatchesForClub).toHaveBeenCalledTimes(2)
  })
})
