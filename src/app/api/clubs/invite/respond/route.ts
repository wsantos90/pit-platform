import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { markNotificationsAsRead } from "@/lib/notifications"

const respondSchema = z.object({
  inviteId: z.string().uuid("inviteId deve ser um UUID valido"),
  action: z.enum(["accept", "reject"]),
})

type InviteLookup = {
  id: string
  club_id: string
  player_id: string
  joined_at: string
  left_at: string | null
  is_active: boolean
  club: {
    id: string
    display_name: string
  } | null
  player: {
    id: string
    user_id: string
    ea_gamertag: string
  } | null
}

type ActiveMembershipLookup = {
  id: string
  club_id: string
  club: {
    display_name: string
  } | null
}

async function markInviteNotificationAsRead(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  inviteId: string
) {
  await markNotificationsAsRead(
    {
      userId,
      type: "roster_invite",
      dataFilter: { club_player_id: inviteId },
    },
    adminClient
  )
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = respondSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const adminClient = createAdminClient()
  const { inviteId, action } = parsed.data

  const { data: invite } = await adminClient
    .from("club_players")
    .select(`
      id, club_id, player_id, joined_at, left_at, is_active,
      club:clubs(id, display_name),
      player:players(id, user_id, ea_gamertag)
    `)
    .eq("id", inviteId)
    .maybeSingle()

  const typedInvite = invite as InviteLookup | null

  if (!typedInvite || !typedInvite.player || !typedInvite.club) {
    return NextResponse.json(
      { error: "invite_not_found", message: "Convite nao encontrado." },
      { status: 404 }
    )
  }

  if (typedInvite.player.user_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  if (typedInvite.left_at !== null || typedInvite.is_active) {
    await markInviteNotificationAsRead(adminClient, user.id, inviteId)
    return NextResponse.json(
      { error: "invite_closed", message: "Este convite nao esta mais pendente." },
      { status: 409 }
    )
  }

  if (action === "accept") {
    const { data: activeMemberships } = await adminClient
      .from("club_players")
      .select(`
        id, club_id,
        club:clubs(display_name)
      `)
      .eq("player_id", typedInvite.player_id)
      .eq("is_active", true)
      .is("left_at", null)

    const conflictingMembership = (activeMemberships as ActiveMembershipLookup[] | null)?.find(
      (membership) => membership.club_id !== typedInvite.club_id
    )

    if (conflictingMembership) {
      await markInviteNotificationAsRead(adminClient, user.id, inviteId)
      return NextResponse.json(
        {
          error: "already_in_active_club",
          message: `Voce ja esta ativo em ${conflictingMembership.club?.display_name ?? "outro time"}.`,
        },
        { status: 409 }
      )
    }

    const acceptedAt = new Date().toISOString()
    const { error: acceptError } = await adminClient
      .from("club_players")
      .update({
        is_active: true,
        joined_at: acceptedAt,
        left_at: null,
      })
      .eq("id", inviteId)

    if (acceptError) {
      return NextResponse.json(
        { error: "accept_failed", message: "Nao foi possivel aceitar o convite." },
        { status: 500 }
      )
    }

    await Promise.all([
      markInviteNotificationAsRead(adminClient, user.id, inviteId),
      adminClient.from("players").update({ is_free_agent: false }).eq("id", typedInvite.player_id),
    ])

    return NextResponse.json({
      success: true,
      message: `Voce agora faz parte do elenco de ${typedInvite.club.display_name}.`,
    })
  }

  const rejectedAt = new Date().toISOString()
  const { error: rejectError } = await adminClient
    .from("club_players")
    .update({
      left_at: rejectedAt,
    })
    .eq("id", inviteId)
    .eq("is_active", false)

  if (rejectError) {
    return NextResponse.json(
      { error: "reject_failed", message: "Nao foi possivel rejeitar o convite." },
      { status: 500 }
    )
  }

  await markInviteNotificationAsRead(adminClient, user.id, inviteId)

  return NextResponse.json({
    success: true,
    message: `Convite de ${typedInvite.club.display_name} rejeitado.`,
  })
}
