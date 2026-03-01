import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextResponse } from "next/server"

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

import { GET } from "@/app/api/admin/discovery-runs/route"

function unauthorizedAuth(status = 401) {
  return {
    ok: false as const,
    response: NextResponse.json({ error: status === 401 ? "Unauthorized" : "forbidden" }, { status }),
  }
}

describe("GET /api/admin/discovery-runs", () => {
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

  it("returns latest discovery runs", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: true as const,
      user: { id: "admin-1", email: "admin@example.com" },
    })

    const limit = vi.fn().mockResolvedValue({
      data: [
        {
          id: "run-1",
          started_at: "2026-03-01T00:00:00.000Z",
          finished_at: "2026-03-01T00:01:00.000Z",
          status: "completed",
          clubs_scanned: 15,
          clubs_new: 2,
          players_found: 0,
          error_message: null,
        },
      ],
      error: null,
    })

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit,
          }),
        }),
      })),
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.runs).toHaveLength(1)
    expect(body.runs[0].status).toBe("completed")
  })
})
