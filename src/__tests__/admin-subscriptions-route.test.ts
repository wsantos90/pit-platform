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

import { GET } from "@/app/api/admin/subscriptions/route"

describe("GET /api/admin/subscriptions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 403 when user is not admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    })

    const response = await GET(new NextRequest("http://localhost/api/admin/subscriptions"))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe("forbidden")
  })

  it("validates invalid status filter", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: true,
      user: {
        id: "admin-1",
        email: "admin@example.com",
      },
    })

    const response = await GET(
      new NextRequest("http://localhost/api/admin/subscriptions?status=unknown")
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("invalid_status_filter")
  })

  it("returns subscriptions enriched with user and club data", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: true,
      user: {
        id: "admin-1",
        email: "admin@example.com",
      },
    })

    const subscriptionsEq = vi.fn().mockResolvedValue({
      data: [
        {
          id: "sub-1",
          user_id: "user-1",
          club_id: "club-1",
          plan: "premium_team",
          status: "active",
          gateway: "mercadopago",
          gateway_subscription_id: "mp-sub-123",
          amount: "29.90",
          current_period_start: "2026-03-01T00:00:00Z",
          current_period_end: "2026-04-01T00:00:00Z",
          cancelled_at: null,
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z",
        },
      ],
      error: null,
    })

    const usersIn = vi.fn().mockResolvedValue({
      data: [
        {
          id: "user-1",
          display_name: "Admin User",
          email: "admin@pit.com",
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

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "subscriptions") {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  eq: subscriptionsEq,
                }),
              }),
            }),
          }
        }

        if (table === "users") {
          return {
            select: vi.fn().mockReturnValue({
              in: usersIn,
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

        return {}
      }),
    })

    const response = await GET(
      new NextRequest("http://localhost/api/admin/subscriptions?status=active")
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.subscriptions).toHaveLength(1)
    expect(body.subscriptions[0].user_display_name).toBe("Admin User")
    expect(body.subscriptions[0].club_name).toBe("PIT Club")
    expect(body.subscriptions[0].amount).toBe(29.9)
  })
})
