import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { markNotificationsAsRead } from "@/lib/notifications"

const cancelSchema = z.object({
  inviteId: z.string().uuid("inviteId deve ser um UUID valido"),
})

type PendingInviteLookup = {
  id: string
  club_id: string
  left_at: string | null
  is_active: boolean
  club: {
    manager_id: string | null
  } | null
  player: {
    user_id: string
  } | null
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
  const parsed = cancelSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const adminClient = createAdminClient()
  const { inviteId } = parsed.data

  const { data: invite } = await adminClient
    .from("club_players")
    .select(`
      id, club_id, left_at, is_active,
      club:clubs(manager_id),
      player:players(user_id)
    `)
    .eq("id", inviteId)
    .maybeSingle()

  const typedInvite = invite as PendingInviteLookup | null

  if (!typedInvite || !typedInvite.club || !typedInvite.player) {
    return NextResponse.json(
      { error: "invite_not_found", message: "Convite nao encontrado." },
      { status: 404 }
    )
  }

  if (typedInvite.club.manager_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  if (typedInvite.left_at !== null || typedInvite.is_active) {
    return NextResponse.json(
      { error: "invite_closed", message: "Este convite nao esta mais pendente." },
      { status: 409 }
    )
  }

  const cancelledAt = new Date().toISOString()
  const { error: cancelError } = await adminClient
    .from("club_players")
    .update({ left_at: cancelledAt })
    .eq("id", inviteId)
    .eq("is_active", false)

  if (cancelError) {
    return NextResponse.json(
      { error: "cancel_failed", message: "Nao foi possivel cancelar o convite." },
      { status: 500 }
    )
  }

  await markNotificationsAsRead(
    {
      userId: typedInvite.player.user_id,
      type: "roster_invite",
      dataFilter: { club_player_id: inviteId },
    },
    adminClient
  )

  return NextResponse.json({
    success: true,
    message: "Convite cancelado com sucesso.",
  })
}
