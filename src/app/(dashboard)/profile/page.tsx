import { Suspense } from "react"
import EvolutionChart from "@/components/profile/EvolutionChart"
import MatchHistory from "@/components/profile/MatchHistory"
import PlayerHeader from "@/components/profile/PlayerHeader"
import PositionStats from "@/components/profile/PositionStats"
import QuickClubRefreshCard from "@/components/profile/QuickClubRefreshCard"
import StatsOverview from "@/components/profile/StatsOverview"
import { Card, CardContent } from "@/components/ui/card"
import { loadManagerCollectContext } from "@/lib/collect/managerClub"
import { createClient } from "@/lib/supabase/server"
import type { Player } from "@/types/database"

function SectionFallback({ label }: { label: string }) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-6 text-sm text-foreground-secondary">{label}</CardContent>
    </Card>
  )
}

export default async function Page() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const [{ data: player }, context] = await Promise.all([
    supabase.from("players").select("*").eq("user_id", user.id).maybeSingle<Player>(),
    loadManagerCollectContext(supabase, user.id, user.email ?? null),
  ])

  const showManagerSection = context.canCollect || context.roles.includes("manager") || context.roles.includes("admin")

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Meu Perfil</h1>
        <p className="text-sm text-foreground-secondary">
          Dashboard pessoal com header, resumo de desempenho, historico e evolucao por partida.
        </p>
      </div>

      {player ? (
        <PlayerHeader
          gamertag={player.ea_gamertag}
          primaryPosition={player.primary_position}
          secondaryPosition={player.secondary_position}
        />
      ) : (
        <Card className="border-border bg-card">
          <CardContent className="p-6 text-sm text-foreground-secondary">
            Complete seu cadastro de jogador para desbloquear o dashboard de estatisticas.
          </CardContent>
        </Card>
      )}

      {showManagerSection ? (
        context.canCollect && context.managedClub?.ea_club_id ? (
          <QuickClubRefreshCard
            clubName={context.managedClub.display_name || "Clube sem nome"}
            eaClubId={context.managedClub.ea_club_id}
            lastScannedAt={context.managedClub.last_scanned_at}
          />
        ) : (
          <Card className="border-border bg-card">
            <CardContent className="p-6 text-sm text-foreground-secondary">
              Nenhum clube ativo gerenciado foi encontrado para esta conta. Quando houver um clube vinculado ao seu perfil, o atalho de atualizacao rapida aparecera aqui.
            </CardContent>
          </Card>
        )
      ) : null}

      {player ? (
        <>
          <Suspense fallback={<SectionFallback label="Carregando resumo do jogador..." />}>
            <StatsOverview playerId={player.id} />
          </Suspense>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
            <div className="space-y-6">
              <Suspense fallback={<SectionFallback label="Carregando historico..." />}>
                <MatchHistory playerId={player.id} limit={20} showViewAll />
              </Suspense>

              <Suspense fallback={<SectionFallback label="Carregando grafico..." />}>
                <EvolutionChart playerId={player.id} />
              </Suspense>
            </div>

            <Suspense fallback={<SectionFallback label="Carregando stats por posicao..." />}>
              <PositionStats playerId={player.id} />
            </Suspense>
          </div>
        </>
      ) : null}
    </div>
  )
}
