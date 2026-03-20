import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { fetchMatches } from "@/lib/ea/api"
import { tryFetchAkamaiCookies } from "@/lib/ea/cookieClient"
import { parseMatches } from "@/lib/ea/parser"
import { upsertDiscoveredClub } from "@/lib/ea/discovery"
import { loadMatchClassificationContext } from "@/lib/collect/loadMatchClassificationContext"
import { loadManagerCollectContext } from "@/lib/collect/managerClub"
import { persistMatchesForClub } from "@/lib/collect/persistMatches"
import { logger } from '@/lib/logger';

type AdminClient = ReturnType<typeof createAdminClient>
type CollectRunStatus = "running" | "completed" | "failed"

type CollectMode = "server" | "local_extension"

const collectRunPayloadSchema = z
  .object({
    mode: z.enum(["local_extension"]).optional(),
    ea_club_id: z.string().trim().min(1).optional(),
    raw_data: z.unknown().optional(),
  })
  .superRefine((payload, context) => {
    if (payload.mode === "local_extension") {
      if (!payload.ea_club_id) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ea_club_id"],
          message: "ea_club_id is required for local_extension mode",
        })
      }

      if (payload.raw_data === undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["raw_data"],
          message: "raw_data is required for local_extension mode",
        })
      }
    }
  })

const MANUAL_COLLECT_RATE_LIMIT_MS = parsePositiveInt(process.env.MANUAL_COLLECT_RATE_LIMIT_MS, 120_000)

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

async function updateCollectRun(
  adminClient: AdminClient,
  runId: string,
  payload: {
    status: CollectRunStatus
    clubsProcessed: number
    matchesNew: number
    matchesSkipped: number
    errorMessage?: string | null
  }
) {
  const { error } = await adminClient
    .from("collect_runs")
    .update({
      status: payload.status,
      clubs_processed: payload.clubsProcessed,
      matches_new: payload.matchesNew,
      matches_skipped: payload.matchesSkipped,
      finished_at: new Date().toISOString(),
      error_message: payload.errorMessage ?? null,
    })
    .eq("id", runId)

  if (error) {
    throw error
  }
}

function buildRateLimitPayload(lastScannedAt: string) {
  const lastScannedMs = new Date(lastScannedAt).getTime()
  if (Number.isNaN(lastScannedMs)) {
    return null
  }

  const elapsedMs = Date.now() - lastScannedMs
  if (elapsedMs >= MANUAL_COLLECT_RATE_LIMIT_MS) {
    return null
  }

  const retryAfterSeconds = Math.max(1, Math.ceil((MANUAL_COLLECT_RATE_LIMIT_MS - elapsedMs) / 1000))
  return {
    error: "rate_limited",
    retry_after_seconds: retryAfterSeconds,
  }
}

async function upsertDiscoveryClubsFromMatches(matches: ReturnType<typeof parseMatches>, adminClient: AdminClient) {
  const uniqueClubs = new Map<string, { clubId: string; name: string }>()

  for (const match of matches) {
    for (const [clubIdKey, club] of Object.entries(match.clubs)) {
      if (!uniqueClubs.has(clubIdKey)) {
        uniqueClubs.set(clubIdKey, {
          clubId: clubIdKey,
          name: club.nameRaw,
        })
      }
    }
  }

  if (uniqueClubs.size === 0) return

  const results = await Promise.allSettled(
    Array.from(uniqueClubs.values()).map((club) => upsertDiscoveredClub(club, adminClient))
  )

  results.forEach((result) => {
    if (result.status === "rejected") {
      logger.error(`[Collect/Manual] Falha ao persistir clube no Discovery: ${result.reason}`)
    }
  })
}

async function resolveMatchesForManualCollect(
  mode: CollectMode,
  eaClubId: string,
  rawData: unknown,
  adminClient: AdminClient
) {
  if (mode === "local_extension") {
    const matches = parseMatches(rawData, eaClubId)
    await upsertDiscoveryClubsFromMatches(matches, adminClient)
    return matches
  }

  const cookieHeader = (await tryFetchAkamaiCookies()) ?? undefined
  return fetchMatches(eaClubId, cookieHeader)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const payloadJson = await request.json().catch(() => ({}))
  const payload = collectRunPayloadSchema.safeParse(payloadJson ?? {})

  if (!payload.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: payload.error.flatten() },
      { status: 400 }
    )
  }

  const { canCollect, managedClub, managedClubError } = await loadManagerCollectContext(
    supabase,
    user.id,
    user.email ?? null
  )

  if (!canCollect) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  if (managedClubError) {
    return NextResponse.json({ error: "failed_to_load_managed_club" }, { status: 500 })
  }

  if (!managedClub?.ea_club_id) {
    return NextResponse.json({ error: "managed_club_not_found" }, { status: 404 })
  }

  const mode: CollectMode = payload.data.mode === "local_extension" ? "local_extension" : "server"

  if (mode === "local_extension" && payload.data.ea_club_id !== managedClub.ea_club_id) {
    return NextResponse.json({ error: "managed_club_mismatch" }, { status: 403 })
  }

  if (managedClub.last_scanned_at) {
    const rateLimitPayload = buildRateLimitPayload(managedClub.last_scanned_at)
    if (rateLimitPayload) {
      return NextResponse.json(rateLimitPayload, { status: 429 })
    }
  }

  const adminClient = createAdminClient()
  let runId: string | null = null

  try {
    const { data: runData, error: runError } = await adminClient
      .from("collect_runs")
      .insert({
        triggered_by: user.id,
        ea_club_id: managedClub.ea_club_id,
        is_cron: false,
        status: "running",
      })
      .select("id")
      .single()

    if (runError || !runData?.id) {
      return NextResponse.json({ error: "failed_to_start_collect_run" }, { status: 500 })
    }

    runId = runData.id as string

    const matches = await resolveMatchesForManualCollect(
      mode,
      managedClub.ea_club_id,
      payload.data.raw_data,
      adminClient
    )
    const classificationContext = await loadMatchClassificationContext(adminClient)
    const persisted = await persistMatchesForClub(
      managedClub.ea_club_id,
      matches,
      adminClient,
      classificationContext
    )

    const { error: updateScanAtError } = await adminClient
      .from("clubs")
      .update({ last_scanned_at: new Date().toISOString() })
      .eq("ea_club_id", managedClub.ea_club_id)

    if (updateScanAtError) {
      throw updateScanAtError
    }

    await updateCollectRun(adminClient, runId, {
      status: "completed",
      clubsProcessed: 1,
      matchesNew: persisted.matchesNew,
      matchesSkipped: persisted.matchesSkipped,
    })

    return NextResponse.json({
      run_id: runId,
      mode,
      matches_new: persisted.matchesNew,
      matches_skipped: persisted.matchesSkipped,
      players_linked: persisted.playersLinked,
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as Record<string, unknown>).message)
          : JSON.stringify(error)

    if (runId) {
      try {
        await updateCollectRun(adminClient, runId, {
          status: "failed",
          clubsProcessed: 0,
          matchesNew: 0,
          matchesSkipped: 0,
          errorMessage,
        })
      } catch (updateError) {
        logger.error("[Collect/Manual] Failed to mark run as failed:", updateError)
      }
    }

    return NextResponse.json({ error: "failed_to_collect_matches" }, { status: 500 })
  }
}

