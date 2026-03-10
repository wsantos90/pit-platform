import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/app/api/admin/_auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { fetchMatches } from "@/lib/ea/api"
import { tryFetchAkamaiCookies } from "@/lib/ea/cookieClient"
import type { EaParsedMatch } from "@/types/ea-api"

const discoveredClubSchema = z.object({
  clubId: z.string().trim().min(1, "clubId is required"),
  name: z.string().trim().min(1, "name is required"),
  regionId: z.number().int().optional(),
  teamId: z.number().int().optional(),
})

const scanPayloadSchema = z.object({
  clubs: z.array(discoveredClubSchema).min(1, "clubs must contain at least one item").optional(),
})

type SeedClubRow = {
  ea_club_id: string
  display_name: string
}

type ScanRunStatus = "running" | "completed" | "failed" | "cancelled" | "success"
type ScanTarget = { clubId: string; name: string }
type ScanTargetSource = "explicit" | "discovered_clubs" | "active_clubs" | "none"
type ScanTargetLoadResult = {
  targets: ScanTarget[]
  source: ScanTargetSource
  discoveredTargetsCount: number
  seedTargetsCount: number
}

const DEFAULT_MAX_TARGETS = 20
const DEFAULT_BATCH_SIZE = 10
const DEFAULT_RATE_LIMIT_MS = 1500

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.floor(parsed)
}

function chunkArray<T>(items: T[], chunkSize: number) {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize))
  }
  return chunks
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function loadSeedClubs(adminClient: ReturnType<typeof createAdminClient>) {
  const { data, error } = await adminClient
    .from("clubs")
    .select("ea_club_id,display_name")
    .eq("status", "active")
    .limit(200)

  if (error) {
    throw error
  }

  const rows = (data ?? []) as SeedClubRow[]
  return rows.map((row) => ({
    clubId: row.ea_club_id,
    name: row.display_name,
  }))
}

async function loadScanTargets(
  adminClient: ReturnType<typeof createAdminClient>,
  explicitClubs: ScanTarget[] | undefined,
  maxTargets: number
) : Promise<ScanTargetLoadResult> {
  if (explicitClubs && explicitClubs.length > 0) {
    return {
      targets: explicitClubs,
      source: "explicit",
      discoveredTargetsCount: 0,
      seedTargetsCount: 0,
    }
  }

  const { data: discoveredRows, error: discoveredError } = await adminClient
    .from("discovered_clubs")
    .select("ea_club_id,display_name,ea_name_raw,last_scanned_at")
    .order("last_scanned_at", { ascending: true, nullsFirst: true })
    .limit(maxTargets)

  if (discoveredError) {
    throw discoveredError
  }

  const discoveredTargets = (discoveredRows ?? []).map((row) => ({
    clubId: row.ea_club_id,
    name: row.display_name || row.ea_name_raw || row.ea_club_id,
  }))

  if (discoveredTargets.length > 0) {
    return {
      targets: discoveredTargets,
      source: "discovered_clubs",
      discoveredTargetsCount: discoveredTargets.length,
      seedTargetsCount: 0,
    }
  }

  const seedTargets = await loadSeedClubs(adminClient)

  return {
    targets: seedTargets,
    source: seedTargets.length > 0 ? "active_clubs" : "none",
    discoveredTargetsCount: 0,
    seedTargetsCount: seedTargets.length,
  }
}

async function countDiscoveredClubs(adminClient: ReturnType<typeof createAdminClient>) {
  const { count, error } = await adminClient
    .from("discovered_clubs")
    .select("id", { count: "exact", head: true })

  if (error) {
    throw error
  }

  return count ?? 0
}

async function persistDiscoveredPlayers(
  adminClient: ReturnType<typeof createAdminClient>,
  matches: EaParsedMatch[]
) {
  const playersByGamertag = new Map<string, { lastSeenClub: string; lastSeenAt: string }>()

  for (const match of matches) {
    const lastSeenAt = match.timestampUtc.toISOString()
    for (const player of match.players) {
      // playerName = display name real; gamertag = chave do objeto EA (pode ser ID numérico)
      const gamertag = (player.playerName || player.gamertag)?.trim()
      // Ignorar placeholders inválidos retornados pela EA API ("-", ".", etc.)
      if (!gamertag || gamertag === "-" || gamertag === "." || /^\d+$/.test(gamertag)) continue
      playersByGamertag.set(gamertag, {
        lastSeenClub: player.eaClubId,
        lastSeenAt,
      })
    }
  }

  if (playersByGamertag.size === 0) {
    const totalEntries = matches.reduce((acc, m) => acc + m.players.length, 0)
    console.warn(
      `[Discovery] persistDiscoveredPlayers: 0 gamertags extraídos. ` +
        `matches=${matches.length}, totalPlayerEntries=${totalEntries}`
    )
    return 0
  }

  const gamertags = Array.from(playersByGamertag.keys())

  // Chunkar o SELECT para evitar URLs > 16KB (limite do undici)
  const existingByGamertag = new Map<string, number>()
  for (const chunk of chunkArray(gamertags, 100)) {
    const { data: chunkRows, error: chunkError } = await adminClient
      .from("discovered_players")
      .select("ea_gamertag,matches_seen")
      .in("ea_gamertag", chunk)

    if (chunkError) {
      throw chunkError
    }

    for (const row of chunkRows ?? []) {
      existingByGamertag.set(row.ea_gamertag, row.matches_seen ?? 0)
    }
  }

  const upsertRows = gamertags.map((gamertag) => {
    const player = playersByGamertag.get(gamertag)!
    return {
      ea_gamertag: gamertag,
      last_seen_club: player.lastSeenClub,
      last_seen_at: player.lastSeenAt,
      matches_seen: (existingByGamertag.get(gamertag) ?? 0) + 1,
    }
  })

  const results = await Promise.allSettled(
    upsertRows.map((row) =>
      adminClient.from("discovered_players").upsert(row, {
        onConflict: "ea_gamertag",
        ignoreDuplicates: false,
      })
    )
  )

  const rejected = results.filter((result) => result.status === "rejected")
  if (rejected.length > 0) {
    console.error(`[Discovery] ${rejected.length} player upserts failed during scan.`)
  }

  return upsertRows.length
}

async function updateDiscoveryRun(
  adminClient: ReturnType<typeof createAdminClient>,
  runId: string,
  payload: {
    status: ScanRunStatus
    clubs_scanned: number
    clubs_new: number
    players_found?: number
    error_message?: string | null
  }
) {
  const buildUpdatePayload = (status: ScanRunStatus) => ({
    status,
    clubs_scanned: payload.clubs_scanned,
    clubs_new: payload.clubs_new,
    players_found: payload.players_found ?? 0,
    finished_at: new Date().toISOString(),
    error_message: payload.error_message ?? null,
  })

  const attemptUpdate = async (status: ScanRunStatus) =>
    adminClient.from("discovery_runs").update(buildUpdatePayload(status)).eq("id", runId)

  const { error: updateError } = await attemptUpdate(payload.status)
  if (!updateError) return

  if (payload.status === "completed") {
    const { error: legacyError } = await attemptUpdate("success")
    if (!legacyError) return
    throw legacyError
  }

  throw updateError
}

async function failStaleRunningRuns(adminClient: ReturnType<typeof createAdminClient>) {
  const staleThresholdIso = new Date(Date.now() - 2 * 60 * 1000).toISOString()
  const { error } = await adminClient
    .from("discovery_runs")
    .update({
      status: "failed",
      finished_at: new Date().toISOString(),
      error_message: "Run marcada como stale apos timeout operacional.",
    })
    .eq("status", "running")
    .lt("started_at", staleThresholdIso)

  if (error) {
    console.error("Error while failing stale discovery runs:", error)
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return auth.response
  }

  const payload = await request.json().catch(() => ({}))
  const parsedPayload = scanPayloadSchema.safeParse(payload ?? {})

  if (!parsedPayload.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsedPayload.error.flatten() },
      { status: 400 }
    )
  }

  const adminClient = createAdminClient()
  let runId: string | null = null

  await failStaleRunningRuns(adminClient)

  try {
    const { data: runData, error: runError } = await adminClient
      .from("discovery_runs")
      .insert({
        triggered_by: auth.user.id,
        status: "running",
      })
      .select("id")
      .single()

    if (runError || !runData?.id) {
      return NextResponse.json({ error: "failed_to_start_discovery_run" }, { status: 500 })
    }

    runId = runData.id as string

    const { data: cfgRows } = await adminClient
      .from("admin_config")
      .select("key, value")
      .in("key", ["discovery_batch_size", "discovery_max_targets", "discovery_rate_limit_ms"])

    const cfg = Object.fromEntries((cfgRows ?? []).map((r) => [r.key, String(r.value)]))

    const maxTargets = parsePositiveInt(
      cfg["discovery_max_targets"] ?? process.env.DISCOVERY_SCAN_MAX_TARGETS,
      DEFAULT_MAX_TARGETS
    )
    const batchSize = parsePositiveInt(
      cfg["discovery_batch_size"] ?? process.env.DISCOVERY_BATCH_SIZE,
      DEFAULT_BATCH_SIZE
    )
    const rateLimitMs = parsePositiveInt(
      cfg["discovery_rate_limit_ms"] ?? process.env.DISCOVERY_RATE_LIMIT_MS,
      DEFAULT_RATE_LIMIT_MS
    )

    const scanTargetsResult = await loadScanTargets(adminClient, parsedPayload.data.clubs, maxTargets)
    const scanTargets = scanTargetsResult.targets

    if (scanTargets.length === 0) {
      const zeroTargetsMessage =
        "Nenhum alvo disponivel para a varredura. O Discovery nao encontrou clubes em discovered_clubs nem seeds suficientes em clubs com status active."

      await updateDiscoveryRun(adminClient, runId, {
        status: "completed",
        clubs_scanned: 0,
        clubs_new: 0,
        players_found: 0,
        error_message: zeroTargetsMessage,
      })

      return NextResponse.json({
        run_id: runId,
        processed: 0,
        inserted_or_updated: 0,
        message: zeroTargetsMessage,
        target_source: scanTargetsResult.source,
        discovered_targets_count: scanTargetsResult.discoveredTargetsCount,
        seed_targets_count: scanTargetsResult.seedTargetsCount,
        failed: 0,
        failures: [],
      })
    }

    const beforeCount = await countDiscoveredClubs(adminClient)
    const cookieHeader = (await tryFetchAkamaiCookies()) ?? undefined

    const batches = chunkArray(scanTargets, batchSize)

    const failures: Array<{ clubId: string; reason: string }> = []
    let successfulScans = 0
    const allMatches: EaParsedMatch[] = []

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
      const batch = batches[batchIndex]
      const batchResults = await Promise.all(
        batch.map(async (target) => {
          try {
            const matches = await fetchMatches(target.clubId, cookieHeader)
            return { ok: true as const, target, matches }
          } catch (error) {
            return { ok: false as const, target, error }
          }
        })
      )

      for (const result of batchResults) {
        if (result.ok) {
          successfulScans += 1
          allMatches.push(...result.matches)
          continue
        }

        const reason =
          result.error instanceof Error ? result.error.message : "Unknown error"
        failures.push({
          clubId: result.target.clubId,
          reason,
        })
      }

      const hasMoreBatches = batchIndex < batches.length - 1
      if (hasMoreBatches) {
        await sleep(rateLimitMs)
      }
    }

    const playersFound = await persistDiscoveredPlayers(adminClient, allMatches)
    const afterCount = await countDiscoveredClubs(adminClient)
    const clubsNew = Math.max(0, afterCount - beforeCount)

    const runStatus: ScanRunStatus = failures.length > 0 ? "failed" : "completed"
    const firstReason = failures[0]?.reason ?? null
    const errorMessage =
      failures.length > 0
        ? `${failures.length} clubs failed. Primeiro erro: ${firstReason}`
        : null

    await updateDiscoveryRun(adminClient, runId, {
      status: runStatus,
      clubs_scanned: successfulScans,
      clubs_new: clubsNew,
      players_found: playersFound,
      error_message: errorMessage,
    })

    return NextResponse.json({
      run_id: runId,
      processed: scanTargets.length,
      inserted_or_updated: successfulScans,
      players_found: playersFound,
      failed: failures.length,
      failures,
    })
  } catch (error) {
    console.error("[Discovery] Outer catch:", JSON.stringify(error))

    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as Record<string, unknown>)["message"])
          : JSON.stringify(error)

    if (runId) {
      await updateDiscoveryRun(adminClient, runId, {
        status: "failed",
        clubs_scanned: 0,
        clubs_new: 0,
        players_found: 0,
        error_message: errorMessage,
      })
    }

    return NextResponse.json({ error: "failed_to_execute_discovery_scan" }, { status: 500 })
  }
}
