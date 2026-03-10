import Link from "next/link"
import MatchHistory from "@/components/profile/MatchHistory"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import type { Player } from "@/types/database"

export default async function Page() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: player } = await supabase.from("players").select("*").eq("user_id", user.id).maybeSingle<Player>()

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">Minhas Partidas</h1>
          <p className="text-sm text-foreground-secondary">Historico expandido com ate 100 jogos validos no dashboard.</p>
        </div>

        <Button variant="outline" size="sm" asChild>
          <Link href="/profile">Voltar ao perfil</Link>
        </Button>
      </div>

      {player ? (
        <MatchHistory
          playerId={player.id}
          limit={100}
          title="Ultimas 100 partidas"
          description="Lista completa com filtros por periodo, clube e posicao."
        />
      ) : (
        <Card className="border-border bg-card">
          <CardContent className="p-6 text-sm text-foreground-secondary">
            Complete seu cadastro de jogador para visualizar o historico de partidas.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
