import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { hasAnyRole } from "@/lib/auth/roles"
import type { UserRole } from "@/types"

const submitSchema = z.object({
  discoveredClubId: z.string().uuid("discoveredClubId deve ser UUID válido"),
  photoUrl: z.string().trim().min(3, "photoUrl é obrigatório"),
})

const allowedClaimRoles: UserRole[] = ["player", "manager", "admin"]

async function loadCurrentUserProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data } = await supabase
    .from("users")
    .select("id,roles,is_active")
    .eq("id", userId)
    .maybeSingle()

  return {
    roles: (data?.roles ?? []) as UserRole[],
    isActive: data?.is_active ?? true,
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const profile = await loadCurrentUserProfile(supabase, user.id)
  if (!profile.isActive || !hasAnyRole(profile.roles, allowedClaimRoles)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const payload = await request.json().catch(() => null)
  const parsed = submitSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { discoveredClubId, photoUrl } = parsed.data

  const { data: club, error: clubError } = await supabase
    .from("discovered_clubs")
    .select("id,status,display_name")
    .eq("id", discoveredClubId)
    .maybeSingle()

  if (clubError || !club) {
    return NextResponse.json({ error: "club_not_found" }, { status: 404 })
  }

  if (club.status === "active") {
    return NextResponse.json({ error: "club_already_claimed" }, { status: 409 })
  }

  const { data: existingPending, error: pendingError } = await supabase
    .from("claims")
    .select("id")
    .eq("discovered_club_id", discoveredClubId)
    .eq("status", "pending")
    .limit(1)

  if (pendingError) {
    return NextResponse.json({ error: "failed_to_check_pending_claims" }, { status: 500 })
  }

  if ((existingPending ?? []).length > 0) {
    return NextResponse.json({ error: "club_has_pending_claim" }, { status: 409 })
  }

  const { data: createdClaim, error: insertError } = await supabase
    .from("claims")
    .insert({
      user_id: user.id,
      discovered_club_id: discoveredClubId,
      photo_url: photoUrl,
      status: "pending",
    })
    .select("id,status,created_at")
    .single()

  if (insertError || !createdClaim) {
    return NextResponse.json({ error: "failed_to_create_claim" }, { status: 500 })
  }

  await supabase
    .from("discovered_clubs")
    .update({ status: "pending" })
    .eq("id", discoveredClubId)
    .neq("status", "active")

  return NextResponse.json({
    success: true,
    claim: createdClaim,
    club: {
      id: club.id,
      displayName: club.display_name,
      status: "pending",
    },
  })
}
