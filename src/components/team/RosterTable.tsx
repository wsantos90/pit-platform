'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PositionBadge } from '@/components/player/PositionBadge'
import { Button } from '@/components/ui/button'
import type { ClubPlayerRow } from '@/app/(dashboard)/team/page'
import type { PlayerStatsView, PlayerPosition } from '@/types/database'

// Secondary stat shown per position in the "Gols / Partidas" column
function getSecondaryStat(
  position: PlayerPosition,
  stats: PlayerStatsView
): string {
  const matches = stats.total_matches || 1
  switch (position) {
    case 'GK':
      return `Defesas: ${stats.total_saves}`
    case 'ZAG':
      return `CS: ${stats.total_clean_sheets}`
    case 'VOL':
    case 'MC': {
      const perGame = stats.total_tackles / matches
      return `Desarmes: ${perGame.toFixed(1)}/j`
    }
    case 'AE':
    case 'AD':
      return `Assists: ${stats.total_assists}`
    case 'ATA': {
      const eff = matches > 0 ? Math.round((stats.total_goals / matches) * 100) : 0
      return `Eficácia: ${eff}%`
    }
    default:
      return `Assists: ${stats.total_assists}`
  }
}

function getRatingColor(rating: number | null): string {
  if (rating === null) return 'bg-muted'
  if (rating >= 9) return 'bg-emerald-500'
  if (rating >= 7.5) return 'bg-amber-500'
  return 'bg-rose-500'
}

function PlayerAvatar({ gamertag }: { gamertag: string }) {
  const initial = gamertag.trim().charAt(0).toUpperCase() || '?'
  return (
    <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
      {initial}
    </div>
  )
}

type Props = {
  clubPlayers: ClubPlayerRow[]
  statsMap: Record<string, PlayerStatsView>
  clubId: string
  currentUserId: string
}

export function RosterTable({ clubPlayers, statsMap, clubId, currentUserId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [actionId, setActionId] = useState<string | null>(null)
  const supabase = createClient()

  const active = clubPlayers.filter(cp => cp.is_active)
  const pending = clubPlayers.filter(cp => !cp.is_active)
  const all = [...active, ...pending]

  async function handleRemove(cpId: string) {
    setActionId(cpId)
    await supabase
      .from('club_players')
      .update({ left_at: new Date().toISOString(), is_active: false })
      .eq('id', cpId)
    setActionId(null)
    startTransition(() => router.refresh())
  }

  async function handleCancelInvite(cpId: string) {
    setActionId(cpId)
    await supabase
      .from('club_players')
      .update({ left_at: new Date().toISOString() })
      .eq('id', cpId)
      .eq('is_active', false)
    setActionId(null)
    startTransition(() => router.refresh())
  }

  if (all.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
        <span className="material-symbols-outlined text-4xl">group_off</span>
        <p className="text-sm">Nenhum jogador no elenco.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-muted/50">
            <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Atleta
            </th>
            <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Posição
            </th>
            <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Rating
            </th>
            <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Gols / Partidas
            </th>
            <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {all.map((cp) => {
            const player = cp.player
            if (!player) return null

            const stats = statsMap[player.id]
            const isLoading = actionId === cp.id
            const isManager = player.user_id === currentUserId

            if (!cp.is_active) {
              // Pending invite row
              return (
                <tr key={cp.id} className="hover:bg-muted/30 transition-colors opacity-70">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-muted/50 border border-dashed border-border flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
                        {player.ea_gamertag.trim().charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{player.ea_gamertag}</p>
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded px-1.5 py-0.5 mt-0.5">
                          <span className="material-symbols-outlined text-[10px]">hourglass_empty</span>
                          Convite Pendente
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <PositionBadge position={player.primary_position} />
                  </td>
                  <td className="px-5 py-4 text-muted-foreground text-sm">—</td>
                  <td className="px-5 py-4 text-muted-foreground text-sm">Aguardando dados...</td>
                  <td className="px-5 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isLoading || isPending}
                      onClick={() => void handleCancelInvite(cp.id)}
                      className="text-muted-foreground hover:text-destructive text-xs"
                    >
                      {isLoading ? 'Cancelando...' : 'Cancelar convite'}
                    </Button>
                  </td>
                </tr>
              )
            }

            // Active player row
            const rating = stats?.avg_rating ?? null
            const ratingPct = rating !== null ? Math.min(Math.round((rating / 10) * 100), 100) : 0
            const totalGoals = stats?.total_goals ?? 0
            const totalMatches = stats?.total_matches ?? 0
            const secondary = stats ? getSecondaryStat(player.primary_position, stats) : null

            return (
              <tr key={cp.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <PlayerAvatar gamertag={player.ea_gamertag} />
                    <div>
                      <p className="font-bold text-foreground">{player.ea_gamertag}</p>
                      <p className="text-xs text-muted-foreground">
                        {cp.role_in_club === 'manager' ? 'Manager' : cp.role_in_club === 'captain' ? 'Capitão' : 'Jogador'}
                        {' · '}
                        {new Date(cp.joined_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-5 py-4">
                  <div className="flex flex-col gap-1">
                    <PositionBadge position={player.primary_position} />
                    {player.secondary_position && (
                      <PositionBadge position={player.secondary_position} className="opacity-60 text-[9px]" />
                    )}
                  </div>
                </td>

                <td className="px-5 py-4">
                  {rating !== null ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 w-20 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getRatingColor(rating)}`}
                          style={{ width: `${ratingPct}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-foreground tabular-nums">
                        {rating.toFixed(1)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </td>

                <td className="px-5 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground">
                      {totalGoals} / {totalMatches}
                    </span>
                    {secondary && (
                      <span className="text-[10px] text-muted-foreground">{secondary}</span>
                    )}
                  </div>
                </td>

                <td className="px-5 py-4 text-right">
                  {!isManager && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isLoading || isPending}
                      onClick={() => void handleRemove(cp.id)}
                      className="text-muted-foreground hover:text-destructive text-xs"
                    >
                      {isLoading ? 'Removendo...' : 'Remover'}
                    </Button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {pending.length > 0 && (
        <div className="px-5 py-2.5 border-t border-border bg-muted/20 text-[11px] text-muted-foreground">
          Mostrando {all.length} entradas ({pending.length} convite{pending.length > 1 ? 's' : ''} pendente{pending.length > 1 ? 's' : ''})
        </div>
      )}
    </div>
  )
}
