import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { parseMatches } from "@/lib/ea/parser"
import { loadMatchClassificationContext } from "@/lib/collect/loadMatchClassificationContext"
import { persistMatchesForClub } from "@/lib/collect/persistMatches"

type AdminClient = ReturnType<typeof createAdminClient>

type CollectRunRow = {
  id: string
  status: string
  clubs_total: number
  clubs_processed: number
  clubs_failed: number
  matches_new: number
  matches_skipped: number
  collect_token: string | null
  collect_token_expires_at: string | null
  target_ea_club_ids: string[] | null
}

const ingestBodySchema = z.object({
  ea_club_id: z.string().trim().min(1),
  success: z.boolean(),
  raw_data: z.unknown().optional(),
  error: z.string().optional(),
})

async function loadAndValidateRun(
  adminClient: AdminClient,
  runId: string,
  token: string
): Promise<CollectRunRow | { error: string; status: number }> {
  const { data, error } = await adminClient
    .from("collect_runs")
    .select(
      "id,status,clubs_total,clubs_processed,clubs_failed,matches_new,matches_skipped,collect_token,collect_token_expires_at,target_ea_club_ids"
    )
    .eq("id", runId)
    .maybeSingle<CollectRunRow>()

  if (error) {
    return { error: "failed_to_load_run", status: 500 }
  }

  if (!data) {
    return { error: "run_not_found", status: 404 }
  }

  if (data.collect_token !== token) {
    return { error: "invalid_token", status: 401 }
  }

  if (
    !data.collect_token_expires_at ||
    new Date(data.collect_token_expires_at).getTime() < Date.now()
  ) {
    return { error: "token_expired", status: 401 }
  }

  if (data.status !== "running") {
    return { error: "run_not_running", status: 409 }
  }

  return data
}

async function finalizeRunIfComplete(
  adminClient: AdminClient,
  run: CollectRunRow,
  nextProcessed: number,
  nextFailed: number
) {
  const total = run.clubs_total
  if (nextProcessed + nextFailed < total) return

  const finalStatus = nextFailed > 0 && nextProcessed === 0 ? "failed" : "completed"
  await adminClient
    .from("collect_runs")
    .update({
      status: finalStatus,
      finished_at: new Date().toISOString(),
    })
    .eq("id", run.id)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ runId: string }> }
) {
  const token = request.headers.get("x-collect-token") ?? ""
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 401 })
  }

  const { runId } = await context.params
  if (!runId) {
    return NextResponse.json({ error: "missing_run_id" }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const parsed = ingestBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const adminClient = createAdminClient()

  const runOrError = await loadAndValidateRun(adminClient, runId, token)
  if ("error" in runOrError) {
    return NextResponse.json({ error: runOrError.error }, { status: runOrError.status })
  }
  const run = runOrError

  const { ea_club_id, success, raw_data, error: clubError } = parsed.data

  const targets = run.target_ea_club_ids ?? []
  if (!targets.includes(ea_club_id)) {
    return NextResponse.json({ error: "ea_club_id_not_in_targets" }, { status: 400 })
  }

  if (!success) {
    const nextFailed = run.clubs_failed + 1
    await adminClient.from("collect_runs").update({ clubs_failed: nextFailed }).eq("id", run.id)

    console.warn(
      `[TournamentRun/Ingest] Club failed: runId=${runId} ea_club_id=${ea_club_id} error=${clubError ?? "unknown"}`
    )

    await finalizeRunIfComplete(adminClient, run, run.clubs_processed, nextFailed)

    return NextResponse.json({ ok: true, matches_new: 0, matches_skipped: 0 })
  }

  let matchesNew = 0
  let matchesSkipped = 0

  try {
    const matches = parseMatches(raw_data, ea_club_id)
    const classificationContext = await loadMatchClassificationContext(adminClient, {
      targetEaClubIds: run.target_ea_club_ids ?? [],
    })
    const persisted = await persistMatchesForClub(
      ea_club_id,
      matches,
      adminClient,
      classificationContext
    )
    matchesNew = persisted.matchesNew
    matchesSkipped = persisted.matchesSkipped

    await adminClient
      .from("clubs")
      .update({ last_scanned_at: new Date().toISOString() })
      .eq("ea_club_id", ea_club_id)
  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error)
    console.error(
      `[TournamentRun/Ingest] Persist failed: runId=${runId} ea_club_id=${ea_club_id} err=${msg}`
    )

    const nextFailed = run.clubs_failed + 1
    await adminClient.from("collect_runs").update({ clubs_failed: nextFailed }).eq("id", run.id)

    await finalizeRunIfComplete(adminClient, run, run.clubs_processed, nextFailed)

    return NextResponse.json({ error: "failed_to_persist_matches" }, { status: 500 })
  }

  const nextProcessed = run.clubs_processed + 1
  const nextMatchesNew = run.matches_new + matchesNew
  const nextMatchesSkipped = run.matches_skipped + matchesSkipped

  await adminClient
    .from("collect_runs")
    .update({
      clubs_processed: nextProcessed,
      matches_new: nextMatchesNew,
      matches_skipped: nextMatchesSkipped,
    })
    .eq("id", run.id)

  await finalizeRunIfComplete(adminClient, run, nextProcessed, run.clubs_failed)

  return NextResponse.json({ ok: true, matches_new: matchesNew, matches_skipped: matchesSkipped })
}
