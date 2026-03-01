import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/app/api/admin/_auth"
import { fetchMatchesPreview } from "@/lib/ea/api"
import { upsertDiscoveredClub } from "@/lib/ea/discovery"
import { normalizeClubName } from "@/lib/ea/normalize"
import { tryFetchAkamaiCookies } from "@/lib/ea/cookieClient"
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

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return auth.response
  }

  const clubId = request.nextUrl.searchParams.get("clubId")?.trim()
  if (!clubId) {
    return NextResponse.json({ error: "clubId is required" }, { status: 400 })
  }

  try {
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

    return NextResponse.json({
      success: true,
      club: data,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed_to_insert_manual_club"
    return NextResponse.json({ error: "failed_to_insert_manual_club", details: message }, { status: 500 })
  }
}
