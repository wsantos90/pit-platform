import { NextResponse } from "next/server"
import { requireAdmin } from "@/app/api/admin/_auth"
import { fetchDiscoveryProxyHealth } from "@/lib/ea/discoveryHealth"
import { getEaFetchTransport, isCookieServiceConfigured } from "@/lib/ea/runtimeConfig"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return auth.response
  }

  const health = await fetchDiscoveryProxyHealth()

  return NextResponse.json({
    ea_fetch_transport: getEaFetchTransport(),
    cookie_service_configured: isCookieServiceConfigured(),
    service_health: {
      ok: health.service.ok,
      error: health.service.error,
      http_status: health.service.httpStatus,
      status: health.service.payload?.status ?? null,
      last_execution: health.service.payload?.last_execution ?? null,
      next_execution: health.service.payload?.next_execution ?? null,
      cache: {
        has_cookie: health.service.payload?.cache?.hasCookie ?? null,
      },
      renewal: {
        last_error: health.service.payload?.renewal?.lastError ?? null,
      },
      fallback: {
        browserless_configured: health.service.payload?.fallback?.browserlessConfigured ?? null,
      },
    },
    ea_fetch_health: {
      ok: health.eaFetch.ok,
      error: health.eaFetch.error,
      http_status: health.eaFetch.httpStatus,
      stage: health.eaFetch.payload?.stage ?? null,
      resolved_by: health.eaFetch.payload?.resolvedBy ?? null,
      used_cached_cookie: health.eaFetch.payload?.usedCachedCookie ?? null,
      upstream_status: health.eaFetch.payload?.upstreamStatus ?? null,
      content_type: health.eaFetch.payload?.contentType ?? null,
      body_snippet: health.eaFetch.payload?.bodySnippet ?? null,
      last_error: health.eaFetch.payload?.lastError ?? null,
      cache: {
        has_cookie: health.eaFetch.payload?.cache?.hasCookie ?? null,
      },
    },
  })
}
