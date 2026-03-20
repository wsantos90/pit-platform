import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/app/api/admin/_auth"
import { fetchMatchesPreview } from "@/lib/ea/api"
import { upsertDiscoveredClub } from "@/lib/ea/discovery"
import { normalizeClubName } from "@/lib/ea/normalize"
import { tryFetchAkamaiCookies } from "@/lib/ea/cookieClient"
import { createNotification } from "@/lib/notifications"
import { createAdminClient } from "@/lib/supabase/admin"

const insertManualClubSchema = z.object({
  clubId: z.string().trim().min(1, "clubId is required"),
  displayName: z.string().trim().min(2, "displayName must contain at least 2 characters"),
})

function resolveClubNameFromMatch(
  clubId: string,
  match: Awaited<ReturnType<typeof fetchMatchesPreview>>[number]
) {
  const byMap = match.clubs[clubId]?.nameDisplay
  if (byMap) return byMap
  if (match.homeClubId === clubId) return match.homeClubName
  if (match.awayClubId === clubId) return match.awayClubName
  return null
}

type ExistingDiscoveredClub = {
  id: string
  ea_club_id: string
  display_name: string
  status: string
  discovered_via: string | null
}

type PendingClaimRow = {
  id: string
  user_id: string
  discovered_club_id: string
}

async function loadExistingDiscoveredClub(
  adminClient: ReturnType<typeof createAdminClient>,
  clubId: string
) {
  const { data, error } = await adminClient
    .from("discovered_clubs")
    .select("id,ea_club_id,display_name,status,discovered_via")
    .eq("ea_club_id", clubId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as ExistingDiscoveredClub | null) ?? null
}

async function createManualDiscoveryRun(
  adminClient: ReturnType<typeof createAdminClient>,
  input: {
    triggeredBy: string
    clubsNew: number
  }
) {
  const { error } = await adminClient.from("discovery_runs").insert({
    triggered_by: input.triggeredBy,
    status: "completed",
    clubs_scanned: 1,
    clubs_new: input.clubsNew,
    players_found: 0,
    finished_at: new Date().toISOString(),
    run_type: "manual_admin",
  })

  if (error) {
    throw error
  }
}

async function notifyPendingClaimants(
  adminClient: ReturnType<typeof createAdminClient>,
  club: ExistingDiscoveredClub
) {
  const { data, error } = await adminClient
    .from("claims")
    .select("id,user_id,discovered_club_id")
    .eq("status", "pending")
    .eq("discovered_club_id", club.id)

  if (error) {
    throw error
  }

  const pendingClaims = (data as PendingClaimRow[] | null) ?? []
  if (pendingClaims.length === 0) {
    return
  }

  await Promise.all(
    pendingClaims.map(async (claim) => {
      try {
        const result = await createNotification(
          {
            userId: claim.user_id,
            type: "team_discovered",
            title: "Time encontrado",
            message: `O time ${club.display_name} que você solicitou foi adicionado à base do PIT.`,
            data: {
              claim_id: claim.id,
              discovered_club_id: claim.discovered_club_id,
              ea_club_id: club.ea_club_id,
            },
          },
          adminClient
        )

        if (!result.error) {
          return
        }

        console.error("[ManualClub] failed to notify pending claimant", {
          claimId: claim.id,
          userId: claim.user_id,
          clubId: club.ea_club_id,
          error: result.error.message,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error("[ManualClub] failed to notify pending claimant", {
          claimId: claim.id,
          userId: claim.user_id,
          clubId: club.ea_club_id,
          error: message,
        })
      }
    })
  )
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return auth.response
  }

  const clubId = request.nextUrl.searchParams.get("clubId")?.trim()
  if (!clubId) {
    return NextResponse.json({ error: "clubId is required" }, { status: 400 })
  }

  const adminClient = createAdminClient()

  try {
    const existingClub = await loadExistingDiscoveredClub(adminClient, clubId)
    if (existingClub) {
      return NextResponse.json({
        alreadyExists: true,
        club: existingClub,
      })
    }

    const cookies = (await tryFetchAkamaiCookies()) ?? undefined
    const matches = await fetchMatchesPreview(clubId, cookies)

    if (!matches || matches.length === 0) {
      return NextResponse.json({ error: "club_not_found_or_no_recent_matches" }, { status: 404 })
    }

    const recentMatches = matches.slice(0, 10).map((match) => ({
      matchId: match.matchId,
      homeClub: match.homeClubName,
      awayClub: match.awayClubName,
      score: `${match.homeScore} x ${match.awayScore}`,
      date: match.timestampBrasilia,
    }))

    const clubName =
      resolveClubNameFromMatch(clubId, matches[0]) ??
      normalizeClubName(matches[0].homeClubName ?? `Club ${clubId}`)

    return NextResponse.json({
      clubId,
      clubName,
      recentMatches,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed_to_preview_manual_club"
    return NextResponse.json({ error: "failed_to_preview_manual_club", details: message }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return auth.response
  }

  const payload = await request.json().catch(() => null)
  const parsed = insertManualClubSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_payload",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    )
  }

  const { clubId, displayName } = parsed.data
  const adminClient = createAdminClient()

  try {
    const existingClub = await loadExistingDiscoveredClub(adminClient, clubId)
    if (existingClub) {
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        club: existingClub,
      })
    }

    await upsertDiscoveredClub({ clubId, name: displayName }, adminClient)

    const normalizedDisplayName = normalizeClubName(displayName)
    const { data, error } = await adminClient
      .from("discovered_clubs")
      .update({
        display_name: normalizedDisplayName,
        status: "unclaimed",
        discovered_via: "manual_admin",
        last_scanned_at: new Date().toISOString(),
      })
      .eq("ea_club_id", clubId)
      .select("id,ea_club_id,display_name,status,discovered_via")
      .single()

    if (error) {
      return NextResponse.json({ error: "failed_to_update_manual_club" }, { status: 500 })
    }

    const insertedClub = data as ExistingDiscoveredClub

    try {
      await createManualDiscoveryRun(adminClient, {
        triggeredBy: auth.user.id,
        clubsNew: 1,
      })
    } catch (runError) {
      console.error("[ManualClub] failed to log discovery_run", runError)
    }

    try {
      await notifyPendingClaimants(adminClient, insertedClub)
    } catch (notifyError) {
      console.error("[ManualClub] failed to notify claimants", notifyError)
    }

    return NextResponse.json({
      success: true,
      club: insertedClub,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed_to_insert_manual_club"
    return NextResponse.json({ error: "failed_to_insert_manual_club", details: message }, { status: 500 })
  }
}
