import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { fetchMatches } from "@/lib/ea/api"
import { tryFetchAkamaiCookies } from "@/lib/ea/cookieClient"
import { persistMatchesForClub } from "@/lib/collect/persistMatches"
import { hasAnyRole } from "@/lib/auth/roles"
import type { UserRole } from "@/types"

type ServerClient = Awaited<ReturnType<typeof createClient>>
type AdminClient = ReturnType<typeof createAdminClient>
type CollectRunStatus = "running" | "completed" | "failed"

type UserProfileRow = {
  id: string
  email: string | null
  roles: unknown
  is_active: boolean | null
}

type ManagedClubRow = {
  ea_club_id: string
  last_scanned_at: string | null
}

const BACKEND_RATE_LIMIT_MS = 30 * 60 * 1000

async function loadProfileByIdOrEmail(supabase: ServerClient, userId: string, email: string | null) {
  const { data: byId } = await supabase
    .from("users")
    .select("id,email,roles,is_active")
    .eq("id", userId)
    .maybeSingle<UserProfileRow>()

  if (byId) return byId
  if (!email) return null

  const { data: byEmail } = await supabase
    .from("users")
    .select("id,email,roles,is_active")
    .eq("email", email)
    .maybeSingle<UserProfileRow>()

  return byEmail
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
  if (elapsedMs >= BACKEND_RATE_LIMIT_MS) {
    return null
  }

  const retryAfterSeconds = Math.max(1, Math.ceil((BACKEND_RATE_LIMIT_MS - elapsedMs) / 1000))
  return {
    error: "rate_limited",
    retry_after_seconds: retryAfterSeconds,
  }
}

export async function POST(_request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const profile = await loadProfileByIdOrEmail(supabase, user.id, user.email ?? null)
  const roles = (profile?.roles ?? []) as UserRole[]
  const isActive = profile?.is_active ?? true

  if (!isActive || !hasAnyRole(roles, ["manager", "admin"])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { data: managedClub, error: managedClubError } = await supabase
    .from("clubs")
    .select("ea_club_id,last_scanned_at")
    .eq("manager_id", user.id)
    .eq("status", "active")
    .maybeSingle<ManagedClubRow>()

  if (managedClubError) {
    return NextResponse.json({ error: "failed_to_load_managed_club" }, { status: 500 })
  }

  if (!managedClub?.ea_club_id) {
    return NextResponse.json({ error: "managed_club_not_found" }, { status: 404 })
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

    const cookieHeader = (await tryFetchAkamaiCookies()) ?? undefined
    const matches = await fetchMatches(managedClub.ea_club_id, cookieHeader)
    const persisted = await persistMatchesForClub(managedClub.ea_club_id, matches, adminClient)

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
        console.error("[Collect/Manual] Failed to mark run as failed:", updateError)
      }
    }

    return NextResponse.json({ error: "failed_to_collect_matches" }, { status: 500 })
  }
}
