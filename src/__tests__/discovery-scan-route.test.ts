import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"

const { mockCreateAdminClient, mockRequireAdmin, mockFetchMatches, mockTryFetchAkamaiCookies } = vi.hoisted(
  () => ({
    mockCreateAdminClient: vi.fn(),
    mockRequireAdmin: vi.fn(),
    mockFetchMatches: vi.fn(),
    mockTryFetchAkamaiCookies: vi.fn(),
  })
)

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mockCreateAdminClient,
}))

vi.mock("@/app/api/admin/_auth", () => ({
  requireAdmin: mockRequireAdmin,
}))

vi.mock("@/lib/ea/api", () => ({
  fetchMatches: mockFetchMatches,
}))

vi.mock("@/lib/ea/cookieClient", () => ({
  tryFetchAkamaiCookies: mockTryFetchAkamaiCookies,
}))

import { POST } from "@/app/api/discovery/scan/route"

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/discovery/scan", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  })
}

function makeAdminClient(options?: {
  legacySuccessStatusOnly?: boolean
  discoveredCounts?: number[]
  scanTargets?: Array<{ ea_club_id: string; display_name: string; ea_name_raw: string; last_scanned_at: string | null }>
}) {
  const discoveredCounts = [...(options?.discoveredCounts ?? [10, 16])]
  const staleCleanupLt = vi.fn().mockResolvedValue({ data: null, error: null })

  const discoveryRunInsertSingle = vi.fn().mockResolvedValue({
    data: { id: "run-1" },
    error: null,
  })

  const discoveryRunUpdate = vi.fn().mockImplementation((payload: { status: string }) => ({
    eq: vi.fn((column: string) => {
      if (column === "status") {
        return {
          lt: staleCleanupLt,
        }
      }

      if (options?.legacySuccessStatusOnly && payload.status === "completed") {
        return Promise.resolve({
          data: null,
          error: { message: "check constraint violation for completed" },
        })
      }

      return Promise.resolve({ data: null, error: null })
    }),
  }))

  const discoveredPlayersIn = vi.fn().mockResolvedValue({
    data: [{ ea_gamertag: "player-a", matches_seen: 2 }],
    error: null,
  })
  const discoveredPlayersUpsert = vi.fn().mockResolvedValue({ data: null, error: null })

  return {
    from: vi.fn((table: string) => {
      if (table === "discovery_runs") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: discoveryRunInsertSingle,
            }),
          }),
          update: discoveryRunUpdate,
        }
      }

      if (table === "discovered_clubs") {
        return {
          select: vi.fn((_: string, optionsArg?: { head?: boolean }) => {
            if (optionsArg?.head) {
              return Promise.resolve({
                count: discoveredCounts.shift() ?? 0,
                error: null,
              })
            }

            return {
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: options?.scanTargets ?? [],
                  error: null,
                }),
              }),
            }
          }),
        }
      }

      if (table === "clubs") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }
      }

      if (table === "discovered_players") {
        return {
          select: vi.fn().mockReturnValue({
            in: discoveredPlayersIn,
          }),
          upsert: discoveredPlayersUpsert,
        }
      }

      if (table === "admin_config") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [
                { key: "discovery_batch_size", value: 10 },
                { key: "discovery_max_targets", value: 20 },
                { key: "discovery_rate_limit_ms", value: 1500 },
              ],
              error: null,
            }),
          }),
        }
      }

      return {}
    }),
    __mocks: {
      discoveredPlayersUpsert,
      staleCleanupLt,
    },
  }
}

describe("POST /api/discovery/scan", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({
      ok: true,
      user: {
        id: "11111111-1111-4111-8111-111111111111",
        email: "admin@example.com",
      },
    })
    mockTryFetchAkamaiCookies.mockResolvedValue(null)
  })

  it("returns 401 when unauthorized", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    })

    const response = await POST(makeRequest({ clubs: [{ clubId: "1", name: "Club One" }] }))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("Unauthorized")
  })

  it("returns 400 for invalid payload", async () => {
    const response = await POST(makeRequest({ clubs: [] }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("Invalid payload")
  })

  it("executes scan linked to EA fetch and returns discovery counters", async () => {
    const adminClient = makeAdminClient({ discoveredCounts: [10, 16] })
    mockCreateAdminClient.mockReturnValue(adminClient)

    mockFetchMatches
      .mockResolvedValueOnce([
        {
          timestampUtc: new Date("2026-03-01T00:00:00.000Z"),
          players: [
            { gamertag: "player-a", eaClubId: "1" },
            { gamertag: "player-b", eaClubId: "1" },
          ],
        },
      ] as never)
      .mockResolvedValueOnce([
        {
          timestampUtc: new Date("2026-03-01T00:10:00.000Z"),
          players: [{ gamertag: "player-b", eaClubId: "2" }],
        },
      ] as never)

    const response = await POST(
      makeRequest({
        clubs: [
          { clubId: "1", name: "Cassia" },
          { clubId: "2", name: "Athetica" },
        ],
      })
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      run_id: "run-1",
      processed: 2,
      inserted_or_updated: 2,
      players_found: 2,
      failed: 0,
      failures: [],
    })
    expect(mockFetchMatches).toHaveBeenCalledTimes(2)
    expect(adminClient.__mocks.discoveredPlayersUpsert).toHaveBeenCalledTimes(2)
  })

  it("falls back to legacy success status when completed is rejected", async () => {
    const adminClient = makeAdminClient({
      legacySuccessStatusOnly: true,
      discoveredCounts: [4, 4],
    })
    mockCreateAdminClient.mockReturnValue(adminClient)
    mockFetchMatches.mockResolvedValue([] as never)

    const response = await POST(
      makeRequest({
        clubs: [{ clubId: "1", name: "Cassia" }],
      })
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.failed).toBe(0)
  })
})
