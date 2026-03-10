import { getCookieServiceSecret, getCookieServiceUrl } from "@/lib/ea/runtimeConfig"

type CookieServiceHealthResponse = {
  status?: string
  last_execution?: string | null
  next_execution?: string | null
  fallback?: {
    browserlessConfigured?: boolean
  }
  renewal?: {
    lastError?: string | null
  }
  cache?: {
    hasCookie?: boolean
  }
}

type CookieServiceEaFetchHealthResponse = {
  ok?: boolean
  stage?: string | null
  resolvedBy?: string | null
  usedCachedCookie?: boolean | null
  upstreamStatus?: number | null
  contentType?: string | null
  bodySnippet?: string | null
  lastError?: string | null
  cache?: {
    hasCookie?: boolean
  }
}

type HealthResult<TPayload> = {
  ok: boolean
  error: string | null
  httpStatus: number | null
  payload: TPayload | null
}

export type DiscoveryHealthStatus = {
  service: HealthResult<CookieServiceHealthResponse>
  eaFetch: HealthResult<CookieServiceEaFetchHealthResponse>
}

async function fetchJson<TPayload>(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<HealthResult<TPayload>> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      cache: "no-store",
      signal: controller.signal,
    })

    const rawBody = await response.text().catch(() => "")
    let parsedPayload: TPayload | null = null

    if (rawBody) {
      try {
        parsedPayload = JSON.parse(rawBody) as TPayload
      } catch {
        parsedPayload = null
      }
    }

    if (!response.ok) {
      return {
        ok: false,
        error: rawBody || `cookie_service_health_${response.status}`,
        httpStatus: response.status,
        payload: parsedPayload,
      }
    }

    return {
      ok: true,
      error: null,
      httpStatus: response.status,
      payload: parsedPayload,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      ok: false,
      error: message,
      httpStatus: null,
      payload: null,
    }
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchDiscoveryProxyHealth(): Promise<DiscoveryHealthStatus> {
  const cookieServiceUrl = getCookieServiceUrl()

  if (!cookieServiceUrl) {
    return {
      service: {
        ok: false,
        error: "cookie_service_not_configured",
        httpStatus: null,
        payload: null,
      },
      eaFetch: {
        ok: false,
        error: "cookie_service_not_configured",
        httpStatus: null,
        payload: null,
      },
    }
  }

  const [service, eaFetch] = await Promise.all([
    fetchJson<CookieServiceHealthResponse>(
      `${cookieServiceUrl}/health`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
      15_000
    ),
    fetchJson<CookieServiceEaFetchHealthResponse>(
      `${cookieServiceUrl}/health/ea-fetch`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "x-secret": getCookieServiceSecret(),
        },
      },
      45_000
    ),
  ])

  return {
    service,
    eaFetch,
  }
}

