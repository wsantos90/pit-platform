'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TeamDashboard } from '@/components/team/TeamDashboard'
import { RosterTable } from '@/components/team/RosterTable'
import { MatchHistoryTable } from '@/components/team/MatchHistoryTable'
import { LineupVisual } from '@/components/team/LineupVisual'
import type { Club, PlayerStatsView, Player } from '@/types/database'
import type { ClubPlayerRow, MatchRow, ClubStats } from '@/app/(dashboard)/team/page'

type Props = {
  club: Club
  clubPlayers: ClubPlayerRow[]
  statsMap: Record<string, PlayerStatsView>
  matches: MatchRow[]
  clubStats: ClubStats
  currentUserId: string
}

type PlayerSearchResult = Pick<Player, 'id' | 'ea_gamertag' | 'primary_position' | 'secondary_position'>
type FeedbackState = { type: 'success' | 'error'; message: string } | null

export function TeamManagementClient({
  club,
  clubPlayers,
  statsMap,
  matches,
  clubStats,
  currentUserId,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PlayerSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [invitingId, setInvitingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const supabase = createClient()

  const existingPlayerIds = new Set(
    clubPlayers.filter((cp) => cp.player).map((cp) => cp.player!.id)
  )

  async function handleSearch(query: string) {
    setSearchQuery(query)
    if (query.trim().length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    const { data } = await supabase
      .from('players')
      .select('id, ea_gamertag, primary_position, secondary_position')
      .ilike('ea_gamertag', `%${query}%`)
      .limit(8)

    setSearchResults(
      ((data ?? []) as PlayerSearchResult[]).filter((player) => !existingPlayerIds.has(player.id))
    )
    setIsSearching(false)
  }

  async function handleInvite(playerId: string) {
    setInvitingId(playerId)
    setInviteError(null)

    try {
      const response = await fetch('/api/clubs/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubId: club.id,
          playerId,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setInviteError(payload?.message ?? 'Nao foi possivel enviar o convite.')
        return
      }

      setFeedback({
        type: 'success',
        message: payload?.message ?? 'Convite enviado com sucesso.',
      })
      setShowInviteModal(false)
      setSearchQuery('')
      setSearchResults([])
      startTransition(() => router.refresh())
    } catch {
      setInviteError('Nao foi possivel enviar o convite.')
    } finally {
      setInvitingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Gestao de Elenco
          </h1>
          <p className="text-sm text-muted-foreground">
            {club.display_name}
            <span className="mx-1.5 text-muted-foreground/40">·</span>
            EA ID: {club.ea_club_id}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setShowInviteModal(true)
              setInviteError(null)
            }}
            className="gap-1.5"
          >
            <span className="material-symbols-outlined text-base">person_add</span>
            Convidar Atleta
          </Button>
        </div>
      </div>

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

      <Tabs defaultValue="elenco" className="w-full">
        <TabsList className="mb-6 h-auto w-full justify-start gap-1 rounded-none border-b border-border bg-transparent pb-0">
          <TabsTrigger
            value="elenco"
            className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-0 text-sm font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            Elenco
            {clubStats.activeCount > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                {clubStats.activeCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="historico"
            className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-0 text-sm font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            Historico
          </TabsTrigger>
          <TabsTrigger
            value="matchmaking"
            className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-0 text-sm font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            Matchmaking
          </TabsTrigger>
          <TabsTrigger
            value="escalacao"
            className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-0 text-sm font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            Escalacao
          </TabsTrigger>
        </TabsList>

        <TabsContent value="elenco" className="mt-0">
          <TeamDashboard stats={clubStats} />
          <RosterTable
            clubPlayers={clubPlayers}
            statsMap={statsMap}
            currentUserId={currentUserId}
          />
        </TabsContent>

        <TabsContent value="historico" className="mt-0">
          <MatchHistoryTable matches={matches} clubId={club.id} />
        </TabsContent>

        <TabsContent value="matchmaking" className="mt-0">
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
              <span className="material-symbols-outlined text-3xl text-primary">sports_esports</span>
            </div>
            <div>
              <h3 className="mb-1 text-lg font-bold text-foreground">Matchmaking em breve</h3>
              <p className="max-w-xs text-sm text-muted-foreground">
                Fila de busca por adversarios em tempo real. Esta funcionalidade esta sendo desenvolvida.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="escalacao" className="mt-0">
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
              <span className="material-symbols-outlined text-3xl text-primary">grid_view</span>
            </div>
            <div>
              <h3 className="mb-1 text-lg font-bold text-foreground">Escalacao em breve</h3>
              <p className="max-w-xs text-sm text-muted-foreground">
                Grid visual de campo no esquema 3-5-2 com jogadores posicionados.
              </p>
            </div>
            <LineupVisual />
          </div>
        </TabsContent>
      </Tabs>

      {showInviteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowInviteModal(false)
              setInviteError(null)
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
            style={{ backdropFilter: 'blur(16px)' }}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">Convidar Atleta</h3>
                <p className="text-sm text-muted-foreground">Busque pelo gamertag EA do jogador</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="size-8 p-0"
                onClick={() => {
                  setShowInviteModal(false)
                  setInviteError(null)
                }}
              >
                <span className="material-symbols-outlined text-base">close</span>
              </Button>
            </div>

            <div className="relative mb-4">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground">
                search
              </span>
              <Input
                placeholder="Buscar gamertag..."
                className="pl-9"
                value={searchQuery}
                onChange={(event) => void handleSearch(event.target.value)}
                autoFocus
              />
            </div>

            {isSearching && (
              <p className="py-4 text-center text-sm text-muted-foreground">Buscando...</p>
            )}

            {!isSearching && searchResults.length === 0 && searchQuery.length >= 2 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhum jogador encontrado.
              </p>
            )}

            {searchResults.length > 0 && (
              <ul className="overflow-hidden rounded-xl border border-border">
                {searchResults.map((player) => (
                  <li
                    key={player.id}
                    className="flex items-center justify-between border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-sm font-bold text-primary">
                        {player.ea_gamertag.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{player.ea_gamertag}</p>
                        <p className="text-xs text-muted-foreground">{player.primary_position}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={invitingId === player.id || isPending}
                      onClick={() => void handleInvite(player.id)}
                      className="text-xs"
                    >
                      {invitingId === player.id ? 'Convidando...' : 'Convidar'}
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {inviteError ? (
              <p className="mt-4 text-sm text-destructive">{inviteError}</p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
