import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"

const { mockRequireAdmin, mockCreateAdminClient } = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockCreateAdminClient: vi.fn(),
}))

vi.mock("@/app/api/admin/_auth", () => ({
  requireAdmin: mockRequireAdmin,
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mockCreateAdminClient,
}))

import { GET } from "@/app/api/admin/financial/route"

describe("GET /api/admin/financial", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when unauthenticated", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    })

    const response = await GET(new NextRequest("http://localhost/api/admin/financial?period=30d"))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("Unauthorized")
  })

  it("returns financial payload with projection and delinquent clubs", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: true,
      user: {
        id: "admin-1",
        email: "admin@example.com",
      },
    })

    const financialLimit = vi.fn().mockResolvedValue({
      data: [
        {
          period: "2026-03-02T00:00:00Z",
          total_revenue: "10.00",
          total_refunded: "0.00",
          total_pending: "3.00",
          tournament_revenue: "6.00",
          subscription_revenue: "4.00",
          overdue_count: 1,
        },
        {
          period: "2026-03-01T00:00:00Z",
          total_revenue: "20.00",
          total_refunded: "0.00",
          total_pending: "0.00",
          tournament_revenue: "15.00",
          subscription_revenue: "5.00",
          overdue_count: 0,
        },
      ],
      error: null,
    })

    const overdueLimit = vi.fn().mockResolvedValue({
      data: [
        {
          club_id: "club-1",
          amount: "12.50",
          created_at: "2026-02-01T00:00:00Z",
        },
      ],
      error: null,
    })

    const clubsIn = vi.fn().mockResolvedValue({
      data: [
        {
          id: "club-1",
          display_name: "PIT Club",
        },
      ],
      error: null,
    })

    const trustIn = vi.fn().mockResolvedValue({
      data: [
        {
          club_id: "club-1",
          strikes: 2,
        },
      ],
      error: null,
    })

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "v_financial_dashboard") {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: financialLimit,
              }),
            }),
          }
        }

        if (table === "payments") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: overdueLimit,
                }),
              }),
            }),
          }
        }

        if (table === "clubs") {
          return {
            select: vi.fn().mockReturnValue({
              in: clubsIn,
            }),
          }
        }

        if (table === "trust_scores") {
          return {
            select: vi.fn().mockReturnValue({
              in: trustIn,
            }),
          }
        }

        return {}
      }),
    })

    const response = await GET(new NextRequest("http://localhost/api/admin/financial?period=30d"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.summary.revenue_total).toBe(30)
    expect(body.delinquent_clubs).toHaveLength(1)
    expect(body.delinquent_clubs[0].club_name).toBe("PIT Club")
    expect(body.projection_30d).toBeGreaterThan(0)
  })
})
