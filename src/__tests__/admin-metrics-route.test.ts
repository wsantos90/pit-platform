import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextResponse } from "next/server"

const { mockCreateAdminClient, mockRequireAdmin } = vi.hoisted(() => ({
  mockCreateAdminClient: vi.fn(),
  mockRequireAdmin: vi.fn(),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mockCreateAdminClient,
}))

vi.mock("@/app/api/admin/_auth", () => ({
  requireAdmin: mockRequireAdmin,
}))

import { GET } from "@/app/api/admin/metrics/route"

function unauthorizedAuth(status = 401) {
  return {
    ok: false as const,
    response: NextResponse.json({ error: status === 401 ? "Unauthorized" : "forbidden" }, { status }),
  }
}

function buildAdminClient() {
  const clubsEq = vi.fn().mockResolvedValue({ count: 12, error: null })
  const playersEq = vi.fn().mockResolvedValue({ count: 188, error: null })
  const tournamentsIn = vi.fn().mockResolvedValue({ count: 9, error: null })
  const financialLimit = vi.fn().mockResolvedValue({
    data: [
      { period: "2026-01-10T00:00:00Z", total_revenue: "20.50" },
      { period: "2026-01-22T00:00:00Z", total_revenue: "39.50" },
      { period: "2026-02-02T00:00:00Z", total_revenue: "50.00" },
    ],
    error: null,
  })

  return {
    from: vi.fn((table: string) => {
      if (table === "clubs") {
        return {
          select: vi.fn().mockReturnValue({
            eq: clubsEq,
          }),
        }
      }

      if (table === "players") {
        return {
          select: vi.fn().mockReturnValue({
            eq: playersEq,
          }),
        }
      }

      if (table === "tournaments") {
        return {
          select: vi.fn().mockReturnValue({
            in: tournamentsIn,
          }),
        }
      }

      if (table === "v_financial_dashboard") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: financialLimit,
            }),
          }),
        }
      }

      return {}
    }),
    __mocks: {
      clubsEq,
      playersEq,
      tournamentsIn,
      financialLimit,
    },
  }
}

describe("GET /api/admin/metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when unauthenticated", async () => {
    mockRequireAdmin.mockResolvedValue(unauthorizedAuth(401))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("Unauthorized")
  })

  it("returns 403 when user is not admin", async () => {
    mockRequireAdmin.mockResolvedValue(unauthorizedAuth(403))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe("forbidden")
  })

  it("returns metrics payload with monthly aggregation", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: true as const,
      user: { id: "admin-1", email: "admin@example.com" },
    })

    const adminClient = buildAdminClient()
    mockCreateAdminClient.mockReturnValue(adminClient)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.clubs).toBe(12)
    expect(body.players).toBe(188)
    expect(body.tournaments).toBe(9)
    expect(body.revenue).toBe(110)
    expect(body.revenueMonthly).toEqual([
      { month: "2026-01", total: 60 },
      { month: "2026-02", total: 50 },
    ])
  })
})
