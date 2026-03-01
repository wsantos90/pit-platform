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

import { GET, PATCH } from "@/app/api/admin/settings/route"

function makePatchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/settings", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("GET/PATCH /api/admin/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({
      ok: true,
      user: {
        id: "admin-1",
        email: "admin@example.com",
      },
    })
  })

  it("GET returns 401 when unauthenticated", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("Unauthorized")
  })

  it("GET returns settings list", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        { key: "discovery_batch_size", value: 10, description: "batch", updated_at: "2026-03-01T12:00:00Z" },
      ],
      error: null,
    })

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          order,
        }),
      })),
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.settings).toHaveLength(1)
    expect(body.settings[0].key).toBe("discovery_batch_size")
  })

  it("PATCH validates invalid payload", async () => {
    const response = await PATCH(
      makePatchRequest({
        key: "unknown_key",
        value: 10,
      })
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("invalid_payload")
  })

  it("PATCH upserts a valid setting", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        key: "discovery_batch_size",
        value: 12,
        description: "Clubes por batch no discovery",
        updated_at: "2026-03-01T12:30:00Z",
        updated_by: "admin-1",
      },
      error: null,
    })
    const select = vi.fn().mockReturnValue({ single })
    const upsert = vi.fn().mockReturnValue({ select })

    mockCreateAdminClient.mockReturnValue({
      from: vi.fn(() => ({
        upsert,
      })),
    })

    const response = await PATCH(
      makePatchRequest({
        key: "discovery_batch_size",
        value: 12,
      })
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.setting.key).toBe("discovery_batch_size")
    expect(upsert).toHaveBeenCalled()
  })
})
