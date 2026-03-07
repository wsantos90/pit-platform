import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { fetchMatches } from "@/lib/ea/api"
import { tryFetchAkamaiCookies } from "@/lib/ea/cookieClient"
import { persistMatchesForClub } from "@/lib/collect/persistMatches"
import { createAdminClient } from "@/lib/supabase/admin"

type AdminClient = ReturnType<typeof createAdminClient>
type CollectRunStatus = "running" | "completed" | "failed"

type ActiveClubRow = {
  ea_club_id: string
}

const DEFAULT_BATCH_SIZE = 10
const DEFAULT_RATE_LIMIT_MS = 1500
const STALE_RUN_THRESHOLD_MS = 2 * 60 * 1000

const cronHeaderSchema = z.object({
  secret: z.string().trim().min(1, "x-cron-secret is required"),
})

function parsePositiveInt(value: unknown, fallback: number) {
  if (value === null || value === undefined) return fallback

  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number(String(value))

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

async function failStaleRunningRuns(adminClient: AdminClient) {
  const staleThresholdIso = new Date(Date.now() - STALE_RUN_THRESHOLD_MS).toISOString()
  const { error } = await adminClient
    .from("collect_runs")
    .update({
      status: "failed",
      finished_at: new Date().toISOString(),
      error_message: "Run marcada como stale apos timeout operacional.",
    })
    .eq("status", "running")
    .lt("started_at", staleThresholdIso)

  if (error) {
    console.error("[Collect/Cron] Error while failing stale collect runs:", error)
  }
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

async function loadCollectConfig(adminClient: AdminClient) {
  const { data } = await adminClient
    .from("admin_config")
    .select("key,value")
    .in("key", ["discovery_batch_size", "discovery_rate_limit_ms"])

  const configByKey = new Map<string, unknown>()
  for (const row of data ?? []) {
    configByKey.set(row.key, row.value)
  }

  return {
    batchSize: parsePositiveInt(
      configByKey.get("discovery_batch_size") ?? process.env.DISCOVERY_BATCH_SIZE,
      DEFAULT_BATCH_SIZE
    ),
    rateLimitMs: parsePositiveInt(
      configByKey.get("discovery_rate_limit_ms") ?? process.env.DISCOVERY_RATE_LIMIT_MS,
      DEFAULT_RATE_LIMIT_MS
    ),
  }
}

async function loadActiveClubs(adminClient: AdminClient) {
  const { data, error } = await adminClient
    .from("clubs")
    .select("ea_club_id")
    .eq("status", "active")

  if (error) {
    throw error
  }

  return (data ?? []) as ActiveClubRow[]
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.N8N_WEBHOOK_SECRET
  const parsedHeader = cronHeaderSchema.safeParse({
    secret: request.headers.get("x-cron-secret") ?? "",
  })

  if (!expectedSecret || !parsedHeader.success || parsedHeader.data.secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const adminClient = createAdminClient()
  let runId: string | null = null

  await failStaleRunningRuns(adminClient)

  try {
    const { data: runData, error: runError } = await adminClient
      .from("collect_runs")
      .insert({
        is_cron: true,
        status: "running",
      })
      .select("id")
      .single()

    if (runError || !runData?.id) {
      return NextResponse.json({ error: "failed_to_start_collect_run" }, { status: 500 })
    }

    runId = runData.id as string

    const activeClubs = await loadActiveClubs(adminClient)
    const activeClubIds = activeClubs.map((club) => club.ea_club_id)

    if (activeClubIds.length === 0) {
      await updateCollectRun(adminClient, runId, {
        status: "completed",
        clubsProcessed: 0,
        matchesNew: 0,
        matchesSkipped: 0,
      })

      return NextResponse.json({
        run_id: runId,
        clubs_processed: 0,
        matches_new: 0,
        matches_skipped: 0,
        failed: 0,
        failures: [],
      })
    }

    const { batchSize, rateLimitMs } = await loadCollectConfig(adminClient)
    const cookieHeader = (await tryFetchAkamaiCookies()) ?? undefined

    const failures: Array<{ ea_club_id: string; reason: string }> = []
    let clubsProcessed = 0
    let matchesNew = 0
    let matchesSkipped = 0

    const batches = chunkArray(activeClubIds, batchSize)

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
      const batch = batches[batchIndex]
      const successfulClubs: string[] = []

      const batchResults = await Promise.all(
        batch.map(async (clubId) => {
          try {
            const matches = await fetchMatches(clubId, cookieHeader)
            const persisted = await persistMatchesForClub(clubId, matches, adminClient)
            return { ok: true as const, clubId, persisted }
          } catch (error) {
            return { ok: false as const, clubId, error }
          }
        })
      )

      for (const result of batchResults) {
        if (result.ok) {
          clubsProcessed += 1
          matchesNew += result.persisted.matchesNew
          matchesSkipped += result.persisted.matchesSkipped
          successfulClubs.push(result.clubId)
          continue
        }

        const reason = result.error instanceof Error ? result.error.message : "Unknown error"
        failures.push({
          ea_club_id: result.clubId,
          reason,
        })
      }

      if (successfulClubs.length > 0) {
        const { error: scanUpdateError } = await adminClient
          .from("clubs")
          .update({ last_scanned_at: new Date().toISOString() })
          .in("ea_club_id", successfulClubs)

        if (scanUpdateError) {
          throw scanUpdateError
        }
      }

      const hasMoreBatches = batchIndex < batches.length - 1
      if (hasMoreBatches) {
        await sleep(rateLimitMs)
      }
    }

    const status: CollectRunStatus = failures.length > 0 ? "failed" : "completed"
    const errorMessage =
      failures.length > 0
        ? `${failures.length} clubes falharam. Primeiro erro: ${failures[0]?.reason ?? "unknown"}`
        : null

    await updateCollectRun(adminClient, runId, {
      status,
      clubsProcessed,
      matchesNew,
      matchesSkipped,
      errorMessage,
    })

    return NextResponse.json({
      run_id: runId,
      clubs_processed: clubsProcessed,
      matches_new: matchesNew,
      matches_skipped: matchesSkipped,
      failed: failures.length,
      failures,
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
        console.error("[Collect/Cron] Failed to mark collect run as failed:", updateError)
      }
    }

    return NextResponse.json({ error: "failed_to_execute_collect_cron" }, { status: 500 })
  }
}
