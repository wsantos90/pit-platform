'use client'

import { useState, useTransition } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { Plus, RefreshCw, Save, ShieldCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { LineupVisual } from '@/components/team/LineupVisual'
import { RosterBench } from '@/components/team/RosterBench'
import {
  buildLineupPlayers,
  createEmptyLineup,
  isPlayerValidForSlot,
  lineupAssignmentsToPayload,
  mapLineupPlayersToAssignments,
  type LineupPlayerSummary,
  type PlayerInPosition,
} from '@/lib/lineups'
import type { Lineup, LineupPlayer, PlayerPosition } from '@/types/database'

export type ManagedLineup = Lineup & {
  lineup_players: Array<
    LineupPlayer & {
      player: {
        id: string
        ea_gamertag: string
        primary_position: PlayerPosition
        secondary_position: PlayerPosition | null
      } | null
    }
  >
}

type LineupPageClientProps = {
  clubName: string
  rosterPlayers: LineupPlayerSummary[]
  initialLineups: ManagedLineup[]
}

function getAssignmentsFromLineup(lineup: ManagedLineup | null) {
  if (!lineup) {
    return createEmptyLineup()
  }

  return mapLineupPlayersToAssignments(lineup.lineup_players)
}

function getLineupName(lineup: ManagedLineup | null) {
  return lineup?.name ?? 'Escalação Principal'
}

function getFormationScores(assignments: PlayerInPosition[]) {
  const filledPositions = new Set(
    assignments
      .filter((assignment) => assignment.player)
      .map((assignment) => assignment.positionId)
  )

  const defenseFilled = ['GK', 'ZAG1', 'ZAG2', 'ZAG3', 'VOL1', 'VOL2'].filter((slot) =>
    filledPositions.has(slot as PlayerInPosition['positionId'])
  ).length
  const attackFilled = ['AE', 'AD', 'MC', 'ATA1', 'ATA2'].filter((slot) =>
    filledPositions.has(slot as PlayerInPosition['positionId'])
  ).length

  return {
    defense: 58 + Math.round((defenseFilled / 6) * 30),
    attack: 56 + Math.round((attackFilled / 5) * 34),
    chemistry: Math.round((filledPositions.size / 11) * 100),
  }
}

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-[#8ca7ca]">
        <span>{label}</span>
        <span className="text-[#5fa4ff]">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-[#0d1c2f]">
        <div
          className="h-full rounded-full bg-[#4b84f0]"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  )
}

export function LineupPageClient({
  clubName,
  rosterPlayers,
  initialLineups,
}: LineupPageClientProps) {
  const [lineups, setLineups] = useState(initialLineups)
  const [selectedLineupId, setSelectedLineupId] = useState<string | null>(initialLineups[0]?.id ?? null)
  const [lineupName, setLineupName] = useState(initialLineups[0]?.name ?? 'Escalação Principal')
  const [assignments, setAssignments] = useState<PlayerInPosition[]>(() => getAssignmentsFromLineup(initialLineups[0] ?? null))
  const [benchSearch, setBenchSearch] = useState('')
  const [activePlayer, setActivePlayer] = useState<LineupPlayerSummary | null>(null)
  const [isPending, startTransition] = useTransition()
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  )

  const assignedPlayerIds = new Set(
    assignments
      .map((assignment) => assignment.player?.id)
      .filter((playerId): playerId is string => Boolean(playerId))
  )

  const benchPlayers = rosterPlayers.filter((player) => !assignedPlayerIds.has(player.id))
  const filteredBenchPlayers = benchPlayers.filter((player) =>
    player.ea_gamertag.toLowerCase().includes(benchSearch.trim().toLowerCase())
  )
  const formationScores = getFormationScores(assignments)

  async function refreshLineups(nextSelectedLineupId?: string | null) {
    const response = await fetch('/api/lineups', { cache: 'no-store' })
    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload) {
      throw new Error(payload?.error ?? 'failed_to_load_lineups')
    }

    const nextLineups = payload.lineups as ManagedLineup[]
    setLineups(nextLineups)

    const fallbackId = nextLineups[0]?.id ?? null
    const desiredId = nextSelectedLineupId ?? selectedLineupId ?? fallbackId
    const nextSelected = nextLineups.find((lineup) => lineup.id === desiredId)?.id ?? fallbackId

    setSelectedLineupId(nextSelected)

    const nextLineup = nextLineups.find((lineup) => lineup.id === nextSelected) ?? null
    setLineupName(getLineupName(nextLineup))
    setAssignments(getAssignmentsFromLineup(nextLineup))
  }

  function selectLineup(lineup: ManagedLineup | null) {
    if (!lineup) {
      setSelectedLineupId(null)
      setLineupName(`Escalação ${lineups.length + 1}`)
      setAssignments(createEmptyLineup())
      return
    }

    setSelectedLineupId(lineup.id)
    setLineupName(getLineupName(lineup))
    setAssignments(getAssignmentsFromLineup(lineup))
  }

  function handleCreateNew() {
    selectLineup(null)
  }

  function handleRemovePlayer(positionId: PlayerInPosition['positionId']) {
    setAssignments((current) =>
      current.map((assignment) =>
        assignment.positionId === positionId
          ? { ...assignment, player: null }
          : assignment
      )
    )
  }

  function handleDragStart(event: DragStartEvent) {
    const draggedPlayer = event.active.data.current?.player as LineupPlayerSummary | undefined
    setActivePlayer(draggedPlayer ?? null)
  }

  function handleDragCancel() {
    setActivePlayer(null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const targetId = event.over?.id
    const draggedPlayer = event.active.data.current?.player as LineupPlayerSummary | undefined

    setActivePlayer(null)

    if (!targetId || !draggedPlayer) {
      return
    }

    const positionId = String(targetId) as PlayerInPosition['positionId']
    if (!isPlayerValidForSlot(draggedPlayer, positionId)) {
      toast.error('Jogador não joga nessa posição')
      return
    }

    setAssignments((current) =>
      buildLineupPlayers(
        current.map((assignment) =>
          assignment.positionId === positionId
            ? { positionId, player: draggedPlayer }
            : assignment.player?.id === draggedPlayer.id
              ? { positionId: assignment.positionId, player: null }
              : assignment
        )
      )
    )
  }

  function buildRequestBody() {
    return {
      name: lineupName.trim(),
      formation: '3-5-2' as const,
      players: lineupAssignmentsToPayload(assignments),
    }
  }

  function handleSave() {
    if (!lineupName.trim()) {
      toast.error('Informe um nome para a escalação')
      return
    }

    startTransition(() => {
      void (async () => {
        const isEditing = Boolean(selectedLineupId)
        const endpoint = isEditing ? `/api/lineups/${selectedLineupId}` : '/api/lineups'
        const method = isEditing ? 'PUT' : 'POST'

        const response = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildRequestBody()),
        })

        const payload = await response.json().catch(() => null)

        if (!response.ok) {
          toast.error(payload?.error ?? 'Não foi possível salvar a escalação')
          return
        }

        await refreshLineups(payload?.lineupId ?? selectedLineupId)
        toast.success(isEditing ? 'Escalação atualizada' : 'Escalação criada')
      })().catch(() => {
        toast.error('Não foi possível salvar a escalação')
      })
    })
  }

  function handleSetDefault() {
    if (!selectedLineupId) {
      toast.error('Salve a escalação antes de definir como padrão')
      return
    }

    startTransition(() => {
      void (async () => {
        const response = await fetch(`/api/lineups/${selectedLineupId}/default`, {
          method: 'POST',
        })
        const payload = await response.json().catch(() => null)

        if (!response.ok) {
          toast.error(payload?.error ?? 'Não foi possível definir a escalação padrão')
          return
        }

        await refreshLineups(selectedLineupId)
        toast.success('Escalação padrão atualizada')
      })().catch(() => {
        toast.error('Não foi possível definir a escalação padrão')
      })
    })
  }

  function handleDelete() {
    if (!selectedLineupId) {
      handleCreateNew()
      return
    }

    startTransition(() => {
      void (async () => {
        const response = await fetch(`/api/lineups/${selectedLineupId}`, {
          method: 'DELETE',
        })
        const payload = await response.json().catch(() => null)

        if (!response.ok) {
          toast.error(payload?.error ?? 'Não foi possível excluir a escalação')
          return
        }

        await refreshLineups(null)
        toast.success('Escalação removida')
      })().catch(() => {
        toast.error('Não foi possível excluir a escalação')
      })
    })
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-6">
        <Card className="overflow-hidden border-[#143154] bg-[linear-gradient(180deg,_#07111d_0%,_#040a14_100%)] shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
          <CardHeader className="gap-5 border-b border-[#0f223b] bg-[linear-gradient(180deg,_rgba(8,19,33,0.98),rgba(5,11,19,0.96))]">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <CardTitle className="text-[2.05rem] font-black tracking-tight text-white">
                    Escalação Visual
                  </CardTitle>
                  <span className="rounded-md border border-[#28569a] bg-[#0d7ff2]/12 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-[#5ca8ff]">
                    Formação 3-5-2
                  </span>
                </div>
                <CardDescription className="max-w-2xl text-sm text-[#7b97bb]">
                  Organize o onze titular do {clubName} com mais clareza visual e salve variações de jogo.
                </CardDescription>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#21457b] bg-[#0a1828] text-white hover:bg-[#0d2238]"
                  onClick={handleCreateNew}
                >
                  <Plus className="size-4" />
                  Nova escalação
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#21457b] bg-[#0a1828] text-white hover:bg-[#0d2238]"
                  onClick={() => void refreshLineups()}
                  disabled={isPending}
                >
                  <RefreshCw className="size-4" />
                  Recarregar
                </Button>
                <Button
                  type="button"
                  className="bg-[#4a84f0] text-white shadow-[0_0_24px_rgba(74,132,240,0.32)] hover:bg-[#5a91f2]"
                  onClick={handleSave}
                  disabled={isPending}
                >
                  <Save className="size-4" />
                  Salvar alterações
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="grid gap-5 p-5 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
            <div className="rounded-[26px] border border-[#142d4c] bg-[#09111a] p-4">
              <div className="mb-4">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#6ea7ff]">
                  Escalações salvas
                </p>
              </div>

              <div className="space-y-3">
                {lineups.length > 0 ? (
                  lineups.map((lineup) => (
                    <button
                      key={lineup.id}
                      type="button"
                      onClick={() => selectLineup(lineup)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        lineup.id === selectedLineupId
                          ? 'border-[#4a84f0] bg-[#151f2e] shadow-[0_0_0_1px_rgba(74,132,240,0.3)]'
                          : 'border-[#16283f] bg-[#111922] hover:bg-[#151e29]'
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-white">{lineup.name}</p>
                        {lineup.is_default ? (
                          <span className="rounded-full bg-[#21457b] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#81b4ff]">
                            Padrão
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-[#768fb2]">{lineup.formation} • Salva</p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#1a3558] px-4 py-8 text-center text-sm text-[#7389a7]">
                    Nenhuma escalação salva ainda.
                  </div>
                )}
              </div>

              <Button
                type="button"
                className="mt-4 w-full bg-[#4a84f0] text-white hover:bg-[#5a91f2]"
                onClick={handleCreateNew}
              >
                <Plus className="size-4" />
                Criar nova escalação
              </Button>
            </div>

            <div className="rounded-[28px] border border-[#142d4c] bg-[linear-gradient(180deg,_rgba(7,15,25,0.98),rgba(5,10,18,0.98))] p-5">
              <div className="mb-5 flex flex-col gap-4 border-b border-[#10243e] pb-5">
                <div>
                  <p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#6ea7ff]">
                    Nome da escalação
                  </p>
                  <Input
                    value={lineupName}
                    onChange={(event) => setLineupName(event.target.value)}
                    placeholder="Ex.: Escalação Principal"
                    className="h-14 border-[#21457b] bg-[#0a1523] text-3xl font-black tracking-tight text-white placeholder:text-[#56708d]"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-[#21457b] bg-[#0a1828] text-white hover:bg-[#0d2238]"
                    onClick={handleSetDefault}
                    disabled={isPending || !selectedLineupId}
                  >
                    <ShieldCheck className="size-4" />
                    Definir padrão
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-[#4b2426] bg-[#181014] text-[#ff8d94] hover:bg-[#23141a]"
                    onClick={handleDelete}
                    disabled={isPending}
                  >
                    <Trash2 className="size-4" />
                    Excluir
                  </Button>
                </div>
              </div>

              <LineupVisual players={assignments} onRemovePlayer={handleRemovePlayer} />
            </div>

            <div className="space-y-4">
              <RosterBench
                players={filteredBenchPlayers}
                disabled={isPending}
                totalCount={rosterPlayers.length}
                searchValue={benchSearch}
                onSearchChange={setBenchSearch}
              />

              <div className="rounded-[26px] border border-[#142d4c] bg-[#0b1522] p-5">
                <h3 className="mb-5 text-lg font-bold text-white">Estatísticas da formação</h3>
                <div className="space-y-5">
                  <StatBar label="Defesa" value={formationScores.defense} />
                  <StatBar label="Ataque" value={formationScores.attack} />
                  <StatBar label="Química" value={formationScores.chemistry} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DragOverlay dropAnimation={null}>
        {activePlayer ? (
          <div className="min-w-[220px] rounded-2xl border border-[#4a84f0]/40 bg-[#0a1625]/95 px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
            <p className="text-sm font-semibold text-white">{activePlayer.ea_gamertag}</p>
            <p className="mt-1 text-xs text-[#7f9fc5]">
              {activePlayer.primary_position}
              {activePlayer.secondary_position ? ` / ${activePlayer.secondary_position}` : ''}
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
