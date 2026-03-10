import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextResponse } from "next/server"

const { mockRequireAdmin } = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
}))

vi.mock("@/app/api/admin/_auth", () => ({
  requireAdmin: mockRequireAdmin,
}))

import { GET } from "@/app/api/admin/discovery-health/route"

describe("GET /api/admin/discovery-health", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    process.env.COOKIE_SERVICE_URL = "https://cookie.menteembeta.com.br"
    process.env.COOKIE_SERVICE_SECRET = "proxy-secret"
    delete process.env.EA_FETCH_TRANSPORT
    mockRequireAdmin.mockResolvedValue({
      ok: true,
      user: { id: "admin-1", email: "admin@example.com" },
    })
  })

  it("returns 401 when unauthenticated", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("Unauthorized")
  })

  it("returns combined service and ea-fetch diagnostics without exposing secrets", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            status: "ok",
            last_execution: "2026-03-09T00:00:00.000Z",
            next_execution: "2026-03-09T00:19:00.000Z",
            cache: { hasCookie: true },
            renewal: { lastError: null },
            fallback: { browserlessConfigured: false },
          }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            ok: true,
            stage: "cached_cookie",
            resolvedBy: "cache",
            usedCachedCookie: true,
            upstreamStatus: 200,
            contentType: "application/json",
            bodySnippet: null,
            lastError: null,
            cache: { hasCookie: true },
          }),
      } as unknown as Response)

    vi.stubGlobal("fetch", mockFetch)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ea_fetch_transport).toBe("browser_proxy")
    expect(body.cookie_service_configured).toBe(true)
    expect(body.service_health.status).toBe("ok")
    expect(body.service_health.cache.has_cookie).toBe(true)
    expect(body.ea_fetch_health.ok).toBe(true)
    expect(body.ea_fetch_health.stage).toBe("cached_cookie")
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "https://cookie.menteembeta.com.br/health/ea-fetch",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-secret": "proxy-secret",
        }),
      })
    )
    expect(JSON.stringify(body)).not.toContain("proxy-secret")
  })

  it("keeps service ok but marks ea fetch as failed when the real proxy path is broken", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            status: "ok",
            last_execution: "2026-03-09T00:00:00.000Z",
            next_execution: "2026-03-09T00:19:00.000Z",
            cache: { hasCookie: true },
            renewal: { lastError: null },
            fallback: { browserlessConfigured: true },
          }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        text: async () =>
          JSON.stringify({
            error: "ea_fetch_failed",
            stage: "cached_cookie",
            resolvedBy: "cache",
            upstreamStatus: 403,
            contentType: "text/html",
            bodySnippet: "<!DOCTYPE html>",
            lastError: "EA API respondeu 403 Forbidden",
            cache: { hasCookie: true },
          }),
      } as unknown as Response)

    vi.stubGlobal("fetch", mockFetch)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.service_health.status).toBe("ok")
    expect(body.ea_fetch_health.ok).toBe(false)
    expect(body.ea_fetch_health.http_status).toBe(502)
    expect(body.ea_fetch_health.stage).toBe("cached_cookie")
    expect(body.ea_fetch_health.last_error).toBe("EA API respondeu 403 Forbidden")
  })
})
