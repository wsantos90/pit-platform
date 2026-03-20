import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"

const {
  mockRequireAdmin,
  mockFetchMatchesPreview,
  mockTryFetchAkamaiCookies,
  mockUpsertDiscoveredClub,
  mockCreateAdminClient,
  mockCreateNotification,
  mockLoggerError,
} = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockFetchMatchesPreview: vi.fn(),
  mockTryFetchAkamaiCookies: vi.fn(),
  mockUpsertDiscoveredClub: vi.fn(),
  mockCreateAdminClient: vi.fn(),
  mockCreateNotification: vi.fn(),
  mockLoggerError: vi.fn(),
}))

vi.mock("@/app/api/admin/_auth", () => ({
  requireAdmin: mockRequireAdmin,
}))

vi.mock("@/lib/ea/api", () => ({
  fetchMatchesPreview: mockFetchMatchesPreview,
}))

vi.mock("@/lib/ea/cookieClient", () => ({
  tryFetchAkamaiCookies: mockTryFetchAkamaiCookies,
}))

vi.mock("@/lib/ea/discovery", () => ({
  upsertDiscoveredClub: mockUpsertDiscoveredClub,
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mockCreateAdminClient,
}))

vi.mock("@/lib/notifications", () => ({
  createNotification: mockCreateNotification,
}))

vi.mock("@/lib/logger", () => ({
  logger: {
    error: mockLoggerError,
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

import { GET, POST } from "@/app/api/admin/manual-club/route"

function makeGetRequest(url: string) {
  return new NextRequest(url, { method: "GET" })
}

function makePostRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/manual-club", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

function makeExistingClub(overrides?: Partial<{
  id: string
  ea_club_id: string
  display_name: string
  status: string
  discovered_via: string | null
}>) {
  return {
    id: "dc-1",
    ea_club_id: "123",
    display_name: "Pit Home",
    status: "unclaimed",
    discovered_via: "manual_admin",
    ...overrides,
  }
}

function makeAdminClient(options?: {
  existingClub?: ReturnType<typeof makeExistingClub> | null
  updatedClub?: ReturnType<typeof makeExistingClub>
  pendingClaims?: Array<{ id: string; user_id: string; discovered_club_id: string }>
  updateError?: { message: string } | null
  discoveryRunError?: { message: string } | null
}) {
  const discoveredClubMaybeSingle = vi.fn().mockResolvedValue({
    data: options?.existingClub ?? null,
    error: null,
  })

  const discoveredClubUpdateSingle = vi.fn().mockResolvedValue({
    data: options?.updatedClub ?? makeExistingClub(),
    error: options?.updateError ?? null,
  })

  const discoveryRunInsert = vi.fn().mockResolvedValue({
    data: null,
    error: options?.discoveryRunError ?? null,
  })

  const claimsByClubId = vi.fn().mockResolvedValue({
    data: options?.pendingClaims ?? [],
    error: null,
  })

  const from = vi.fn((table: string) => {
    if (table === "discovered_clubs") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: discoveredClubMaybeSingle,
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: discoveredClubUpdateSingle,
            }),
          }),
        }),
      }
    }

    if (table === "discovery_runs") {
      return {
        insert: discoveryRunInsert,
      }
    }

    if (table === "claims") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: claimsByClubId,
          }),
        }),
      }
    }

    return {}
  })

  return {
    from,
    __mocks: {
      discoveredClubMaybeSingle,
      discoveredClubUpdateSingle,
      discoveryRunInsert,
      claimsByClubId,
    },
  }
}

describe("GET/POST /api/admin/manual-club", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({
      ok: true,
      user: {
        id: "admin-1",
        email: "admin@example.com",
      },
    })
    mockTryFetchAkamaiCookies.mockResolvedValue(null)
    mockCreateNotification.mockResolvedValue({
      data: null,
      error: null,
      skipped: false,
    })
  })

  it("GET returns 401 when unauthorized", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    })

    const response = await GET(makeGetRequest("http://localhost/api/admin/manual-club?clubId=123"))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("Unauthorized")
  })

  it("GET returns preview data for a valid clubId", async () => {
    mockCreateAdminClient.mockReturnValue(makeAdminClient({ existingClub: null }))
    mockFetchMatchesPreview.mockResolvedValue([
      {
        matchId: "m-1",
        homeClubId: "123",
        awayClubId: "222",
        homeClubName: "Pit Home",
        awayClubName: "Pit Away",
        homeScore: 2,
        awayScore: 1,
        timestampBrasilia: "2026-03-01T10:00:00-03:00",
        clubs: {
          "123": { nameDisplay: "Pit Home" },
          "222": { nameDisplay: "Pit Away" },
        },
      },
    ] as never)

    const response = await GET(makeGetRequest("http://localhost/api/admin/manual-club?clubId=123"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.clubId).toBe("123")
    expect(body.clubName).toBe("Pit Home")
    expect(body.recentMatches).toHaveLength(1)
    expect(body.recentMatches[0].score).toBe("2 x 1")
  })

  it("GET returns duplicate feedback when club already exists", async () => {
    const adminClient = makeAdminClient({
      existingClub: makeExistingClub({
        status: "pending",
        discovered_via: "12345",
      }),
    })
    mockCreateAdminClient.mockReturnValue(adminClient)

    const response = await GET(makeGetRequest("http://localhost/api/admin/manual-club?clubId=123"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.alreadyExists).toBe(true)
    expect(body.club.display_name).toBe("Pit Home")
    expect(body.club.status).toBe("pending")
    expect(mockFetchMatchesPreview).not.toHaveBeenCalled()
  })

  it("POST inserts manual club, logs discovery run and returns success payload", async () => {
    const adminClient = makeAdminClient({
      existingClub: null,
      updatedClub: makeExistingClub(),
    })
    mockCreateAdminClient.mockReturnValue(adminClient)
    mockUpsertDiscoveredClub.mockResolvedValue({ id: "dc-1" })

    const response = await POST(
      makePostRequest({
        clubId: "123",
        displayName: "Pit Home",
      })
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.club.ea_club_id).toBe("123")
    expect(mockUpsertDiscoveredClub).toHaveBeenCalledWith(
      { clubId: "123", name: "Pit Home" },
      adminClient
    )
    expect(adminClient.__mocks.discoveryRunInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        triggered_by: "admin-1",
        status: "completed",
        clubs_scanned: 1,
        clubs_new: 1,
        run_type: "manual_admin",
      })
    )
  })

  it("POST keeps success when discovery_runs logging fails", async () => {
    const adminClient = makeAdminClient({
      existingClub: null,
      updatedClub: makeExistingClub(),
      discoveryRunError: { message: "db offline" },
    })
    mockCreateAdminClient.mockReturnValue(adminClient)
    mockUpsertDiscoveredClub.mockResolvedValue({ id: "dc-1" })

    const response = await POST(
      makePostRequest({
        clubId: "123",
        displayName: "Pit Home",
      })
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mockLoggerError).toHaveBeenCalledWith("[ManualClub] failed to log discovery_run", {
      message: "db offline",
    })
  })

  it("POST notifies pending claimants when the club is inserted", async () => {
    const adminClient = makeAdminClient({
      existingClub: null,
      updatedClub: makeExistingClub(),
      pendingClaims: [
        {
          id: "claim-1",
          user_id: "manager-1",
          discovered_club_id: "dc-1",
        },
      ],
    })
    mockCreateAdminClient.mockReturnValue(adminClient)
    mockUpsertDiscoveredClub.mockResolvedValue({ id: "dc-1" })

    const response = await POST(
      makePostRequest({
        clubId: "123",
        displayName: "Pit Home",
      })
    )

    expect(response.status).toBe(200)
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "manager-1",
        type: "team_discovered",
        title: "Time encontrado",
        data: expect.objectContaining({
          claim_id: "claim-1",
          discovered_club_id: "dc-1",
          ea_club_id: "123",
        }),
      }),
      adminClient
    )
  })

  it("POST keeps success when a claimant notification throws", async () => {
    const adminClient = makeAdminClient({
      existingClub: null,
      updatedClub: makeExistingClub(),
      pendingClaims: [
        {
          id: "claim-1",
          user_id: "manager-1",
          discovered_club_id: "dc-1",
        },
      ],
    })
    mockCreateAdminClient.mockReturnValue(adminClient)
    mockUpsertDiscoveredClub.mockResolvedValue({ id: "dc-1" })
    mockCreateNotification.mockRejectedValueOnce(new Error("notify exploded"))

    const response = await POST(
      makePostRequest({
        clubId: "123",
        displayName: "Pit Home",
      })
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mockLoggerError).toHaveBeenCalledWith(
      "[ManualClub] failed to notify pending claimant",
      expect.objectContaining({
        claimId: "claim-1",
        userId: "manager-1",
        clubId: "123",
        error: "notify exploded",
      })
    )
  })

  it("POST short-circuits when the club already exists", async () => {
    const adminClient = makeAdminClient({
      existingClub: makeExistingClub({
        status: "pending",
        discovered_via: "automatic",
      }),
    })
    mockCreateAdminClient.mockReturnValue(adminClient)

    const response = await POST(
      makePostRequest({
        clubId: "123",
        displayName: "Pit Home",
      })
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.alreadyExists).toBe(true)
    expect(mockUpsertDiscoveredClub).not.toHaveBeenCalled()
    expect(adminClient.__mocks.discoveryRunInsert).not.toHaveBeenCalled()
    expect(mockCreateNotification).not.toHaveBeenCalled()
  })
})
