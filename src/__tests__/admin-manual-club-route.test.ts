import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"

const {
  mockRequireAdmin,
  mockFetchMatchesPreview,
  mockTryFetchAkamaiCookies,
  mockUpsertDiscoveredClub,
  mockCreateAdminClient,
} = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockFetchMatchesPreview: vi.fn(),
  mockTryFetchAkamaiCookies: vi.fn(),
  mockUpsertDiscoveredClub: vi.fn(),
  mockCreateAdminClient: vi.fn(),
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

  it("POST inserts manual club and returns success payload", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "dc-1",
        ea_club_id: "123",
        display_name: "Pit Home",
        status: "unclaimed",
        discovered_via: "manual_admin",
      },
      error: null,
    })

    const adminClient = {
      from: vi.fn((table: string) => {
        if (table === "discovered_clubs") {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single,
                }),
              }),
            }),
          }
        }
        return {}
      }),
    }
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
  })
})
