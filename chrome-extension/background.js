const EA_BASE_URL = "https://proclubs.ea.com/api/fc"
const EA_PLATFORM = "common-gen5"
const EA_COOKIE_DOMAIN = ".ea.com"
const MAX_RETRIES = 2
const COOKIE_SYNC_ALARM = "pit-collect-cookie-sync"
const COOKIE_SYNC_INTERVAL_MINUTES = 19
const STORAGE_KEY = "pit_collect_state_v110"
const COOKIE_SERVICE_URL = "__COOKIE_SERVICE_URL__"
const COOKIE_SERVICE_SECRET = "__COOKIE_SERVICE_SECRET__"

function isCookieSyncConfigured() {
  return (
    COOKIE_SERVICE_URL.length > 0 &&
    !COOKIE_SERVICE_URL.startsWith("__") &&
    COOKIE_SERVICE_SECRET.length > 0 &&
    !COOKIE_SERVICE_SECRET.startsWith("__")
  )
}

function getBuildMode() {
  return isCookieSyncConfigured() ? "generated" : "source"
}

function getCookieServiceLabel() {
  if (!isCookieSyncConfigured()) return null

  try {
    const parsed = new URL(COOKIE_SERVICE_URL)
    return `${parsed.protocol}//${parsed.host}`
  } catch {
    return COOKIE_SERVICE_URL
  }
}

async function readState() {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  return result[STORAGE_KEY] ?? {}
}

async function writeState(partialState) {
  const currentState = await readState()
  const nextState = {
    ...currentState,
    ...partialState,
  }
  await chrome.storage.local.set({ [STORAGE_KEY]: nextState })
  return nextState
}

async function getCookiesSnapshot() {
  const cookies = await chrome.cookies.getAll({ domain: EA_COOKIE_DOMAIN })
  const akBmsc = cookies.find((cookie) => cookie.name === "ak_bmsc")?.value ?? ""
  const bmSv = cookies.find((cookie) => cookie.name === "bm_sv")?.value ?? ""

  return {
    ak_bmsc: akBmsc,
    bm_sv: bmSv,
    cookieCount: cookies.length,
    capturedAt: new Date().toISOString(),
    cookieHeader: cookies.length > 0 ? cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ") : "",
  }
}

async function buildCookieSnapshot() {
  const cookies = await getCookiesSnapshot()
  const state = await readState()

  return {
    ...cookies,
    lastSyncAt: state.lastSyncAt ?? null,
    lastSyncStatus: state.lastSyncStatus ?? null,
    lastSyncError: state.lastSyncError ?? null,
    syncConfigured: isCookieSyncConfigured(),
    buildMode: getBuildMode(),
    cookieServiceLabel: getCookieServiceLabel(),
  }
}

async function syncCookiesNow() {
  const snapshot = await getCookiesSnapshot()

  if (!isCookieSyncConfigured()) {
    const nextState = await writeState({
      lastSyncAt: new Date().toISOString(),
      lastSyncStatus: "disabled",
      lastSyncError: "cookie_service_not_configured",
    })

    return {
      ok: false,
      error: nextState.lastSyncError,
      snapshot: {
        ...snapshot,
        lastSyncAt: nextState.lastSyncAt,
        lastSyncStatus: nextState.lastSyncStatus,
        lastSyncError: nextState.lastSyncError,
        syncConfigured: false,
        buildMode: getBuildMode(),
        cookieServiceLabel: getCookieServiceLabel(),
      },
    }
  }

  if (!snapshot.ak_bmsc || !snapshot.bm_sv) {
    const nextState = await writeState({
      lastSyncAt: new Date().toISOString(),
      lastSyncStatus: "error",
      lastSyncError: "ak_bmsc ou bm_sv nao encontrados no browser.",
    })

    return {
      ok: false,
      error: nextState.lastSyncError,
      snapshot: {
        ...snapshot,
        lastSyncAt: nextState.lastSyncAt,
        lastSyncStatus: nextState.lastSyncStatus,
        lastSyncError: nextState.lastSyncError,
        syncConfigured: true,
        buildMode: getBuildMode(),
        cookieServiceLabel: getCookieServiceLabel(),
      },
    }
  }

  try {
    const response = await fetch(`${COOKIE_SERVICE_URL}/api/cookies`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-secret": COOKIE_SERVICE_SECRET,
      },
      body: JSON.stringify({
        ak_bmsc: snapshot.ak_bmsc,
        bm_sv: snapshot.bm_sv,
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => "")
      throw new Error(body || `cookie_service_${response.status}`)
    }

    const nextState = await writeState({
      lastSyncAt: new Date().toISOString(),
      lastSyncStatus: "success",
      lastSyncError: null,
    })

    return {
      ok: true,
      snapshot: {
        ...snapshot,
        lastSyncAt: nextState.lastSyncAt,
        lastSyncStatus: nextState.lastSyncStatus,
        lastSyncError: nextState.lastSyncError,
        syncConfigured: true,
        buildMode: getBuildMode(),
        cookieServiceLabel: getCookieServiceLabel(),
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const nextState = await writeState({
      lastSyncAt: new Date().toISOString(),
      lastSyncStatus: "error",
      lastSyncError: message,
    })

    return {
      ok: false,
      error: message,
      snapshot: {
        ...snapshot,
        lastSyncAt: nextState.lastSyncAt,
        lastSyncStatus: nextState.lastSyncStatus,
        lastSyncError: nextState.lastSyncError,
        syncConfigured: true,
        buildMode: getBuildMode(),
        cookieServiceLabel: getCookieServiceLabel(),
      },
    }
  }
}

function scheduleCookieSyncAlarm() {
  chrome.alarms.create(COOKIE_SYNC_ALARM, { periodInMinutes: COOKIE_SYNC_INTERVAL_MINUTES })
}

async function fetchEAMatchesRaw(clubId, cookieHeader) {
  const url = `${EA_BASE_URL}/clubs/matches?platform=${EA_PLATFORM}&clubIds=${clubId}&maxResultCount=10&matchType=friendlyMatch`
  let lastError = new Error("Unknown error")

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
    }

    try {
      const headers = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      }
      if (cookieHeader) {
        headers.Cookie = cookieHeader
      }

      const response = await fetch(url, { headers })

      if (response.status === 403) {
        throw new Error(`EA API respondeu 403 Forbidden para clubId=${clubId}`)
      }

      if (!response.ok) {
        throw new Error(`EA API respondeu ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (lastError.message.includes("403")) {
        break
      }
    }
  }

  throw lastError
}

async function captureSnapshotAndSyncIfPossible() {
  const snapshot = await getCookiesSnapshot()
  await writeState({ capturedAt: snapshot.capturedAt })

  if (isCookieSyncConfigured()) {
    await syncCookiesNow().catch(() => undefined)
  }

  return snapshot
}

async function fetchLocalMatchesForClub(eaClubId) {
  const snapshot = await captureSnapshotAndSyncIfPossible()
  return fetchEAMatchesRaw(eaClubId, snapshot.cookieHeader)
}

async function ingestClub(backendBase, runId, token, eaClubId, rawData) {
  const response = await fetch(`${backendBase}/api/collect/tournament-run/${runId}/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-collect-token": token,
    },
    body: JSON.stringify({ ea_club_id: eaClubId, success: true, raw_data: rawData }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(`Ingest falhou ${response.status}: ${text}`)
  }

  return response.json()
}

async function ingestClubFailure(backendBase, runId, token, eaClubId, errorMessage) {
  await fetch(`${backendBase}/api/collect/tournament-run/${runId}/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-collect-token": token,
    },
    body: JSON.stringify({ ea_club_id: eaClubId, success: false, error: errorMessage }),
  }).catch((error) => {
    console.error(`[PIT Collect] Falha ao reportar erro para ${eaClubId}:`, error)
  })
}

function sendProgressMessage(message) {
  chrome.runtime.sendMessage(message).catch(() => {})
}

chrome.runtime.onInstalled.addListener(() => {
  scheduleCookieSyncAlarm()
  void syncCookiesNow().catch(() => undefined)
})

chrome.runtime.onStartup.addListener(() => {
  scheduleCookieSyncAlarm()
  void syncCookiesNow().catch(() => undefined)
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === COOKIE_SYNC_ALARM) {
    void syncCookiesNow().catch(() => undefined)
  }
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_COOKIE_SNAPSHOT") {
    void buildCookieSnapshot()
      .then((snapshot) => sendResponse({ ok: true, snapshot }))
      .catch((error) => {
        const errorMessage = error instanceof Error ? error.message : String(error)
        sendResponse({ ok: false, error: errorMessage })
      })
    return true
  }

  if (message.type === "SYNC_COOKIES") {
    void syncCookiesNow().then(sendResponse)
    return true
  }

  if (message.type === "PING") {
    sendResponse({ ok: true, version: "1.1.0", buildMode: getBuildMode() })
    return true
  }

  sendResponse({ ok: false, error: "unknown_message_type" })
  return true
})

chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
  if (message.type === "PING") {
    sendResponse({ ok: true, version: "1.1.0", buildMode: getBuildMode() })
    return true
  }

  if (message.type === "FETCH_MATCHES_FOR_CLUB") {
    if (!message.eaClubId) {
      sendResponse({ ok: false, error: "invalid_payload" })
      return true
    }

    void fetchLocalMatchesForClub(message.eaClubId)
      .then((rawData) => {
        sendResponse({ ok: true, version: "1.1.0", buildMode: getBuildMode(), rawData })
      })
      .catch((error) => {
        const errorMessage = error instanceof Error ? error.message : String(error)
        sendResponse({ ok: false, error: errorMessage })
      })
    return true
  }

  if (message.type !== "START_COLLECT") {
    sendResponse({ ok: false, error: "unknown_message_type" })
    return true
  }

  const { runId, token, targets, backendBase } = message
  if (!runId || !token || !Array.isArray(targets) || targets.length === 0) {
    sendResponse({ ok: false, error: "invalid_payload" })
    return true
  }

  const base = backendBase || "https://pit-platform.vercel.app"
  sendResponse({ ok: true, total: targets.length, version: "1.1.0", buildMode: getBuildMode() })

  void (async () => {
    const results = { success: 0, failed: 0, matches_new: 0 }

    for (const eaClubId of targets) {
      try {
        const rawData = await fetchLocalMatchesForClub(eaClubId)
        const ingestResult = await ingestClub(base, runId, token, eaClubId, rawData)

        results.success += 1
        results.matches_new += ingestResult.matches_new ?? 0

        sendProgressMessage({
          type: "COLLECT_PROGRESS",
          runId,
          eaClubId,
          status: "success",
          matches_new: ingestResult.matches_new ?? 0,
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        results.failed += 1

        await ingestClubFailure(base, runId, token, eaClubId, errorMessage)
        sendProgressMessage({
          type: "COLLECT_PROGRESS",
          runId,
          eaClubId,
          status: "failed",
          error: errorMessage,
        })
      }
    }

    sendProgressMessage({
      type: "COLLECT_DONE",
      runId,
      results,
    })
  })()

  return true
})
