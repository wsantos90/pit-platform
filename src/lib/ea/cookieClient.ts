/**
 * Cookie Client - Integracao com o Cookie Service (VPS).
 */

import { getCookieServiceSecret, getCookieServiceUrl, isCookieServiceConfigured } from "@/lib/ea/runtimeConfig"

type CookieServiceResponse = {
  ak_bmsc: string
  bm_sv: string
  source: "puppeteer" | "browserless"
  extracted_at: string
  valid_until: string
  resolved_by: "cache" | "puppeteer" | "browserless"
}

export { isCookieServiceConfigured }

export async function fetchAkamaiCookies(): Promise<string> {
  const cookieServiceUrl = getCookieServiceUrl()
  if (!cookieServiceUrl) {
    throw new Error("[cookieClient] COOKIE_SERVICE_URL nao configurada.")
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15_000)

  let response: Response
  try {
    response = await fetch(`${cookieServiceUrl}/api/cookies`, {
      method: "GET",
      headers: {
        "x-secret": getCookieServiceSecret(),
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    })
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(`[cookieClient] Cookie service retornou ${response.status}: ${body}`)
  }

  const data = (await response.json()) as CookieServiceResponse

  if (!data.ak_bmsc?.trim() || !data.bm_sv?.trim()) {
    throw new Error("[cookieClient] Cookie service retornou cookies vazios.")
  }

  return `ak_bmsc=${data.ak_bmsc}; bm_sv=${data.bm_sv}`
}

export async function tryFetchAkamaiCookies(): Promise<string | null> {
  if (!isCookieServiceConfigured()) return null

  try {
    return await fetchAkamaiCookies()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[cookieClient] Falha ao buscar cookies Akamai (continuando sem cookies): ${message}`)
    return null
  }
}
