import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const inviteSchema = z.object({
  clubId: z.string().uuid("clubId deve ser um UUID valido"),
  playerId: z.string().uuid("playerId deve ser um UUID valido"),
})

type ClubInviteLookup = {
  id: string
  display_name: string
  manager_id: string | null
  status: "unclaimed" | "pending" | "active" | "suspended" | "banned"
}

type PlayerInviteLookup = {
  id: string
  user_id: string
  ea_gamertag: string
  status: "active" | "inactive" | "banned"
}

type ClubPlayerLookup = {
  id: string
  club_id: string
  is_active: boolean
}

function mapInviteConflict(errorCode: string) {
  if (errorCode === "same_club_pending") {
    return {
      status: 409,
      body: { error: "invite_exists", message: "Este jogador ja possui um convite pendente para este time." },
    }
  }

  if (errorCode === "same_club_active") {
    return {
      status: 409,
      body: { error: "already_member", message: "Este jogador ja faz parte do elenco ativo." },
    }
  }

  if (errorCode === "active_elsewhere") {
    return {
      status: 409,
      body: { error: "player_unavailable", message: "Este jogador ja esta ativo em outro time." },
    }
  }

  return {
    status: 500,
    body: { error: "invite_failed", message: "Nao foi possivel enviar o convite." },
  }
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
  const parsed = inviteSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { clubId, playerId } = parsed.data
  const adminClient = createAdminClient()

  const [{ data: club }, { data: player }, { data: memberships }] = await Promise.all([
    supabase
      .from("clubs")
      .select("id, display_name, manager_id, status")
      .eq("id", clubId)
      .maybeSingle<ClubInviteLookup>(),
    supabase
      .from("players")
      .select("id, user_id, ea_gamertag, status")
      .eq("id", playerId)
      .maybeSingle<PlayerInviteLookup>(),
    adminClient
      .from("club_players")
      .select("id, club_id, is_active")
      .eq("player_id", playerId)
      .is("left_at", null),
  ])

  if (!club) {
    return NextResponse.json({ error: "club_not_found", message: "Clube nao encontrado." }, { status: 404 })
  }

  if (club.manager_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  if (club.status !== "active") {
    return NextResponse.json(
      { error: "club_inactive", message: "Apenas clubes ativos podem enviar convites." },
      { status: 409 }
    )
  }

  if (!player) {
    return NextResponse.json({ error: "player_not_found", message: "Jogador nao encontrado." }, { status: 404 })
  }

  if (player.user_id === user.id) {
    return NextResponse.json(
      { error: "invalid_target", message: "Voce nao pode convidar o proprio perfil." },
      { status: 409 }
    )
  }

  if (player.status !== "active") {
    return NextResponse.json(
      { error: "player_inactive", message: "Somente jogadores ativos podem receber convite." },
      { status: 409 }
    )
  }

  const openMemberships = (memberships ?? []) as ClubPlayerLookup[]
  const hasPendingInSameClub = openMemberships.some((membership) => membership.club_id === clubId && !membership.is_active)
  if (hasPendingInSameClub) {
    const conflict = mapInviteConflict("same_club_pending")
    return NextResponse.json(conflict.body, { status: conflict.status })
  }

  const hasActiveInSameClub = openMemberships.some((membership) => membership.club_id === clubId && membership.is_active)
  if (hasActiveInSameClub) {
    const conflict = mapInviteConflict("same_club_active")
    return NextResponse.json(conflict.body, { status: conflict.status })
  }

  const hasActiveElsewhere = openMemberships.some((membership) => membership.club_id !== clubId && membership.is_active)
  if (hasActiveElsewhere) {
    const conflict = mapInviteConflict("active_elsewhere")
    return NextResponse.json(conflict.body, { status: conflict.status })
  }

  const invitedAt = new Date().toISOString()
  const { data: invite, error: inviteError } = await adminClient
    .from("club_players")
    .insert({
      club_id: clubId,
      player_id: playerId,
      is_active: false,
      role_in_club: "player",
      joined_at: invitedAt,
    })
    .select("id")
    .single()

  if (inviteError || !invite) {
    return NextResponse.json(
      { error: "invite_failed", message: "Nao foi possivel registrar o convite." },
      { status: 500 }
    )
  }

  const { error: notificationError } = await adminClient.from("notifications").insert({
    user_id: player.user_id,
    type: "roster_invite",
    title: "Convite para elenco",
    message: `${club.display_name} convidou voce para entrar no elenco.`,
    data: {
      club_id: club.id,
      club_name: club.display_name,
      club_player_id: invite.id,
      player_id: player.id,
      player_gamertag: player.ea_gamertag,
      invited_at: invitedAt,
    },
  })

  if (notificationError) {
    await adminClient.from("club_players").delete().eq("id", invite.id)
    return NextResponse.json(
      { error: "notification_failed", message: "O convite nao foi enviado porque a notificacao falhou." },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    inviteId: invite.id,
    message: `Convite enviado para ${player.ea_gamertag}.`,
  })
}
