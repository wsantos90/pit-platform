/**
 * EA Sports FC API - Client
 * Integracao com a API de Pro Clubs da EA.
 */

import { createAdminClient } from "@/lib/supabase/admin"
import type { EaParsedMatch } from "@/types/ea-api"
import { upsertDiscoveredClub } from "./discovery"
import { parseMatches } from "./parser"
import { getCookieServiceSecret, getCookieServiceUrl, getEaFetchTransport } from "./runtimeConfig"
import { logger } from '@/lib/logger';

const EA_BASE_URL = process.env.EA_API_BASE_URL || "https://proclubs.ea.com/api/fc"
const EA_PLATFORM = process.env.EA_PLATFORM || "common-gen5"

/**
 * Backoff exponencial entre retries: 1s -> 2s -> 4s.
 * Total: 4 tentativas (1 inicial + 3 retries com backoff).
 */
const RETRY_BACKOFF_MS = [1000, 2000, 4000] as const

type BrowserProxyErrorPayload = {
  error?: string
  message?: string | null
  stage?: string | null
  resolvedBy?: string | null
  usedCachedCookie?: boolean | null
  upstreamStatus?: number | null
  contentType?: string | null
  bodySnippet?: string | null
  cache?: {
    hasCookie?: boolean | null
  }
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

const FETCH_TIMEOUT_MS = parsePositiveInt(process.env.EA_FETCH_TIMEOUT_MS, 25_000)
const PROXY_TIMEOUT_MS = parsePositiveInt(process.env.EA_PROXY_TIMEOUT_MS, 90_000)

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getEAHeaders(cookies?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  }
  if (cookies) headers.Cookie = cookies
  return headers
}

function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer))
}

function formatBrowserProxyError(status: number, payload: BrowserProxyErrorPayload | null, fallbackText: string): string {
  const stage = payload?.stage ? `stage=${payload.stage}` : null
  const resolvedBy = payload?.resolvedBy ? `resolvedBy=${payload.resolvedBy}` : null
  const cacheState =
    payload?.cache?.hasCookie === true ? "cache=present" : payload?.cache?.hasCookie === false ? "cache=empty" : null
  const upstreamStatus = payload?.upstreamStatus ? `upstream=${payload.upstreamStatus}` : null
  const contentType = payload?.contentType ? `contentType=${payload.contentType}` : null
  const bodySnippet = payload?.bodySnippet ? `body=${payload.bodySnippet}` : null
  const details = [stage, resolvedBy, cacheState, upstreamStatus, contentType, bodySnippet].filter(Boolean).join("; ")
  const fallbackSnippet = fallbackText.trim().replace(/\s+/g, " ").slice(0, 180)
  const message = payload?.message?.trim() || fallbackSnippet || "Proxy browser falhou."

  return details.length > 0
    ? `[EA API] Proxy browser respondeu ${status}: ${message} (${details})`
    : `[EA API] Proxy browser respondeu ${status}: ${message}`
}

async function fetchMatchesRawViaBrowserProxy(clubId: string): Promise<unknown> {
  const cookieServiceUrl = getCookieServiceUrl()
  if (!cookieServiceUrl) {
    throw new Error("[EA API] COOKIE_SERVICE_URL nao configurada para modo browser_proxy.")
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${cookieServiceUrl}/api/ea/matches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-secret": getCookieServiceSecret(),
      },
      body: JSON.stringify({
        clubId,
        maxResultCount: 10,
        matchType: "friendlyMatch",
      }),
      signal: controller.signal,
      cache: "no-store",
    })
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    let payload: BrowserProxyErrorPayload | null = null

    try {
      payload = text ? (JSON.parse(text) as BrowserProxyErrorPayload) : null
    } catch {
      payload = null
    }

    throw new Error(formatBrowserProxyError(response.status, payload, text))
  }

  const payload = (await response.json().catch(() => null)) as { matches?: unknown } | null
  if (!payload || payload.matches === undefined) {
    throw new Error("[EA API] Proxy browser retornou payload invalido (matches ausente).")
  }

  return payload.matches
}

export async function fetchMatchesRaw(clubId: string, cookies?: string): Promise<unknown> {
  if (getEaFetchTransport() === "browser_proxy") {
    return fetchMatchesRawViaBrowserProxy(clubId)
  }

  const url = `${EA_BASE_URL}/clubs/matches?platform=${EA_PLATFORM}&clubIds=${clubId}&maxResultCount=10&matchType=friendlyMatch`
  let lastError: Error = new Error("Unknown error")

  const maxAttempts = RETRY_BACKOFF_MS.length + 1

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      const waitMs = RETRY_BACKOFF_MS[attempt - 1]
      logger.info(`[EA API] Tentativa ${attempt + 1}/${maxAttempts} para clubId=${clubId} (aguardando ${waitMs}ms)`)
      await sleep(waitMs)
    }

    try {
      const response = await fetchWithTimeout(url, {
        headers: getEAHeaders(cookies),
        next: { revalidate: 0 },
      })

      if (!response.ok) {
        throw new Error(`EA API respondeu ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      logger.info(`[EA API] Sucesso na tentativa ${attempt + 1} para clubId=${clubId}`)
      return data
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      logger.error(`[EA API] Tentativa ${attempt + 1} falhou para clubId=${clubId}: ${lastError.message}`)
    }
  }

  throw new Error(
    `[EA API] Todas as ${maxAttempts} tentativas falharam para clubId=${clubId}: ${lastError.message}`
  )
}

export async function fetchMatchesPreview(clubId: string, cookies?: string): Promise<EaParsedMatch[]> {
  const raw = await fetchMatchesRaw(clubId, cookies)
  return parseMatches(raw, clubId)
}

export async function fetchMatches(clubId: string, cookies?: string): Promise<EaParsedMatch[]> {
  const raw = await fetchMatchesRaw(clubId, cookies)
  const matches = parseMatches(raw, clubId)

  const uniqueClubs = new Map<string, { clubId: string; name: string }>()
  for (const match of matches) {
    for (const [clubIdKey, club] of Object.entries(match.clubs)) {
      if (!uniqueClubs.has(clubIdKey)) {
        uniqueClubs.set(clubIdKey, { clubId: clubIdKey, name: club.nameRaw })
      }
    }
  }

  if (uniqueClubs.size > 0) {
    const adminClient = createAdminClient()
    const results = await Promise.allSettled(
      Array.from(uniqueClubs.values()).map((club) => upsertDiscoveredClub(club, adminClient))
    )

    results.forEach((result) => {
      if (result.status === "rejected") {
        logger.error(`[EA API] Falha ao persistir clube no Discovery: ${result.reason}`)
      }
    })
  }

  return matches
}



