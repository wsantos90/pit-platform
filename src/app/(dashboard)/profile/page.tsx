import { createClient } from "@/lib/supabase/server"
import { loadManagerCollectContext } from "@/lib/collect/managerClub"
import QuickClubRefreshCard from "@/components/profile/QuickClubRefreshCard"

export default async function Page() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const context = await loadManagerCollectContext(supabase, user.id, user.email ?? null)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Meu Perfil</h1>
        <p className="text-sm text-foreground-secondary">
          Acompanhe o estado do seu clube e dispare atualizacoes manuais sempre que precisar refletir partidas novas mais rapido.
        </p>
      </div>

      {context.canCollect && context.managedClub?.ea_club_id ? (
        <QuickClubRefreshCard
          clubName={context.managedClub.display_name || "Clube sem nome"}
          eaClubId={context.managedClub.ea_club_id}
          lastScannedAt={context.managedClub.last_scanned_at}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-foreground-secondary">
          Nenhum clube ativo gerenciado foi encontrado para esta conta. Quando houver um clube ativo vinculado ao seu perfil, o atalho de atualizacao rapida aparecera aqui.
        </div>
      )}
    </div>
  )
}
