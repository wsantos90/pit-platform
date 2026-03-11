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
  const supabase = createClient()

  // IDs of players already in club (active or pending)
  const existingPlayerIds = new Set(
    clubPlayers.filter(cp => cp.player).map(cp => cp.player!.id)
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
      ((data ?? []) as PlayerSearchResult[]).filter(p => !existingPlayerIds.has(p.id))
    )
    setIsSearching(false)
  }

  async function handleInvite(playerId: string) {
    setInvitingId(playerId)

    // Create pending club_player record
    await supabase.from('club_players').insert({
      club_id: club.id,
      player_id: playerId,
      is_active: false,
      role_in_club: 'player',
      joined_at: new Date().toISOString(),
    })

    // TODO: Create roster_invite notification for the invited player
    // await supabase.from('notifications').insert({ user_id: player.user_id, type: 'roster_invite', ... })

    setInvitingId(null)
    setShowInviteModal(false)
    setSearchQuery('')
    setSearchResults([])
    startTransition(() => router.refresh())
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Gestão de Elenco
          </h1>
          <p className="text-muted-foreground text-sm">
            {club.display_name}
            <span className="mx-1.5 text-muted-foreground/40">·</span>
            EA ID: {club.ea_club_id}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => setShowInviteModal(true)}
            className="gap-1.5"
          >
            <span className="material-symbols-outlined text-base">person_add</span>
            Convidar Atleta
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="elenco" className="w-full">
        <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent gap-1 h-auto pb-0 mb-6">
          <TabsTrigger
            value="elenco"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3 pt-0 text-sm font-semibold"
          >
            Elenco
            {clubStats.activeCount > 0 && (
              <span className="ml-1.5 text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-bold">
                {clubStats.activeCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="historico"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3 pt-0 text-sm font-semibold"
          >
            Histórico
          </TabsTrigger>
          <TabsTrigger
            value="matchmaking"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3 pt-0 text-sm font-semibold"
          >
            Matchmaking
          </TabsTrigger>
          <TabsTrigger
            value="escalacao"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-3 pt-0 text-sm font-semibold"
          >
            Escalação
          </TabsTrigger>
        </TabsList>

        {/* Elenco Tab */}
        <TabsContent value="elenco" className="mt-0">
          <TeamDashboard stats={clubStats} />
          <RosterTable
            clubPlayers={clubPlayers}
            statsMap={statsMap}
            clubId={club.id}
            currentUserId={currentUserId}
          />
        </TabsContent>

        {/* Histórico Tab */}
        <TabsContent value="historico" className="mt-0">
          <MatchHistoryTable matches={matches} clubId={club.id} />
        </TabsContent>

        {/* Matchmaking Tab — stub */}
        <TabsContent value="matchmaking" className="mt-0">
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="size-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-primary">sports_esports</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground mb-1">Matchmaking em breve</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                Fila de busca por adversários em tempo real. Esta funcionalidade está sendo desenvolvida.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Escalação Tab — stub */}
        <TabsContent value="escalacao" className="mt-0">
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="size-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-primary">grid_view</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground mb-1">Escalação em breve</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                Grid visual de campo no esquema 3-5-2 com jogadores posicionados.
              </p>
            </div>
            <LineupVisual />
          </div>
        </TabsContent>
      </Tabs>

      {/* Invite Modal */}
      {showInviteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowInviteModal(false) }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
            style={{ backdropFilter: 'blur(16px)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-foreground">Convidar Atleta</h3>
                <p className="text-sm text-muted-foreground">Busque pelo gamertag EA do jogador</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="size-8 p-0"
                onClick={() => setShowInviteModal(false)}
              >
                <span className="material-symbols-outlined text-base">close</span>
              </Button>
            </div>

            <div className="relative mb-4">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base">
                search
              </span>
              <Input
                placeholder="Buscar gamertag..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => void handleSearch(e.target.value)}
                autoFocus
              />
            </div>

            {isSearching && (
              <p className="text-sm text-muted-foreground text-center py-4">Buscando...</p>
            )}

            {!isSearching && searchResults.length === 0 && searchQuery.length >= 2 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum jogador encontrado.
              </p>
            )}

            {searchResults.length > 0 && (
              <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                {searchResults.map((player) => (
                  <li
                    key={player.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                        {player.ea_gamertag.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{player.ea_gamertag}</p>
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
          </div>
        </div>
      )}
    </div>
  )
}
