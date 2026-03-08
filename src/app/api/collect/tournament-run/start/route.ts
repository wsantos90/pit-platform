import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/app/api/admin/_auth"
import { createAdminClient } from "@/lib/supabase/admin"

async function loadActiveTournamentClubs(
  adminClient: ReturnType<typeof createAdminClient>
): Promise<string[]> {
  const { data: tournaments, error: tournamentsError } = await adminClient
    .from("tournaments")
    .select("id")
    .in("status", ["confirmed", "in_progress"])

  if (tournamentsError) throw tournamentsError

  const tournamentIds = (tournaments ?? []).map((t) => t.id as string)
  if (tournamentIds.length === 0) return []

  const { data: entries, error: entriesError } = await adminClient
    .from("tournament_entries")
    .select("club_id")
    .in("tournament_id", tournamentIds)

  if (entriesError) throw entriesError

  const clubIds = [...new Set((entries ?? []).map((e) => e.club_id as string))]
  if (clubIds.length === 0) return []

  const { data: clubs, error: clubsError } = await adminClient
    .from("clubs")
    .select("ea_club_id")
    .in("id", clubIds)
    .eq("status", "active")

  if (clubsError) throw clubsError

  return [...new Set((clubs ?? []).map((c) => c.ea_club_id as string))]
}

async function loadAllActiveClubs(
  adminClient: ReturnType<typeof createAdminClient>
): Promise<string[]> {
  const { data: clubs, error } = await adminClient
    .from("clubs")
    .select("ea_club_id")
    .eq("status", "active")
    .not("ea_club_id", "is", null)

  if (error) throw error

  return [...new Set((clubs ?? []).map((c) => c.ea_club_id as string))]
}

export async function POST(_request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return auth.response
  }

  const adminClient = createAdminClient()

  let targets: string[]
  let scope: "tournament" | "club"

  try {
    targets = await loadActiveTournamentClubs(adminClient)
    scope = "tournament"

    // Fallback: se não há torneios ativos, coleta todos os clubes ativos
    if (targets.length === 0) {
      targets = await loadAllActiveClubs(adminClient)
      scope = "club"
    }
  } catch (error) {
    console.error("[TournamentRun/Start] Failed to load clubs:", error)
    return NextResponse.json({ error: "failed_to_load_tournament_clubs" }, { status: 500 })
  }

  if (targets.length === 0) {
    return NextResponse.json({ error: "no_active_clubs" }, { status: 404 })
  }

  const collectToken = crypto.randomUUID()
  const tokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

  const { data: runData, error: runError } = await adminClient
    .from("collect_runs")
    .insert({
      triggered_by: auth.user.id,
      is_cron: false,
      scope,
      status: "running",
      clubs_total: targets.length,
      collect_token: collectToken,
      collect_token_expires_at: tokenExpiresAt,
      target_ea_club_ids: targets,
    })
    .select("id")
    .single()

  if (runError || !runData?.id) {
    console.error("[TournamentRun/Start] Failed to create collect run:", runError)
    return NextResponse.json({ error: "failed_to_start_collect_run" }, { status: 500 })
  }

  return NextResponse.json({
    run_id: runData.id as string,
    token: collectToken,
    targets,
  })
}
