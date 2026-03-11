'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PositionBadge } from '@/components/player/PositionBadge'
import { Button } from '@/components/ui/button'
import type { ClubPlayerRow } from '@/app/(dashboard)/team/page'
import type { PlayerStatsView, PlayerPosition } from '@/types/database'

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
      return `Eficacia: ${eff}%`
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
    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-sm font-bold text-primary">
      {initial}
    </div>
  )
}

type Props = {
  clubPlayers: ClubPlayerRow[]
  statsMap: Record<string, PlayerStatsView>
  currentUserId: string
}

type FeedbackState = { type: 'success' | 'error'; message: string } | null

export function RosterTable({ clubPlayers, statsMap, currentUserId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [actionId, setActionId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const supabase = createClient()

  const active = clubPlayers.filter((cp) => cp.is_active)
  const pending = clubPlayers.filter((cp) => !cp.is_active)
  const all = [...active, ...pending]

  async function handleRemove(cpId: string) {
    setActionId(cpId)
    setFeedback(null)
    await supabase
      .from('club_players')
      .update({ left_at: new Date().toISOString(), is_active: false })
      .eq('id', cpId)
    setActionId(null)
    startTransition(() => router.refresh())
  }

  async function handleCancelInvite(cpId: string) {
    setActionId(cpId)
    setFeedback(null)

    try {
      const response = await fetch('/api/clubs/invite/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId: cpId }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setFeedback({
          type: 'error',
          message: payload?.message ?? 'Nao foi possivel cancelar o convite.',
        })
        return
      }

      setFeedback({
        type: 'success',
        message: payload?.message ?? 'Convite cancelado com sucesso.',
      })
      startTransition(() => router.refresh())
    } catch {
      setFeedback({
        type: 'error',
        message: 'Nao foi possivel cancelar o convite.',
      })
    } finally {
      setActionId(null)
    }
  }

  if (all.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <span className="material-symbols-outlined text-4xl">group_off</span>
        <p className="text-sm">Nenhum jogador no elenco.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {feedback ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Atleta
              </th>
              <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Posicao
              </th>
              <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Rating
              </th>
              <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Gols / Partidas
              </th>
              <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Acoes
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
                return (
                  <tr key={cp.id} className="opacity-70 transition-colors hover:bg-muted/30">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 text-sm font-bold text-muted-foreground">
                          {player.ea_gamertag.trim().charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{player.ea_gamertag}</p>
                          <span className="mt-0.5 inline-flex items-center gap-1 rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-600">
                            <span className="material-symbols-outlined text-[10px]">hourglass_empty</span>
                            Convite Pendente
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <PositionBadge position={player.primary_position} />
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">-</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">Aguardando dados...</td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isLoading || isPending}
                        onClick={() => void handleCancelInvite(cp.id)}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        {isLoading ? 'Cancelando...' : 'Cancelar convite'}
                      </Button>
                    </td>
                  </tr>
                )
              }

              const rating = stats?.avg_rating ?? null
              const ratingPct = rating !== null ? Math.min(Math.round((rating / 10) * 100), 100) : 0
              const totalGoals = stats?.total_goals ?? 0
              const totalMatches = stats?.total_matches ?? 0
              const secondary = stats ? getSecondaryStat(player.primary_position, stats) : null

              return (
                <tr key={cp.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <PlayerAvatar gamertag={player.ea_gamertag} />
                      <div>
                        <p className="font-bold text-foreground">{player.ea_gamertag}</p>
                        <p className="text-xs text-muted-foreground">
                          {cp.role_in_club === 'manager'
                            ? 'Manager'
                            : cp.role_in_club === 'captain'
                              ? 'Capitao'
                              : 'Jogador'}
                          {' · '}
                          {new Date(cp.joined_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1">
                      <PositionBadge position={player.primary_position} />
                      {player.secondary_position && (
                        <PositionBadge position={player.secondary_position} className="text-[9px] opacity-60" />
                      )}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    {rating !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${getRatingColor(rating)}`}
                            style={{ width: `${ratingPct}%` }}
                          />
                        </div>
                        <span className="tabular-nums text-sm font-bold text-foreground">
                          {rating.toFixed(1)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
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
                        className="text-xs text-muted-foreground hover:text-destructive"
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
          <div className="border-t border-border bg-muted/20 px-5 py-2.5 text-[11px] text-muted-foreground">
            Mostrando {all.length} entradas ({pending.length} convite{pending.length > 1 ? 's' : ''} pendente{pending.length > 1 ? 's' : ''})
          </div>
        )}
      </div>
    </div>
  )
}
