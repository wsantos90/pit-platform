'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { LineupPlayerSummary } from '@/lib/lineups'

type RosterBenchProps = {
  players: LineupPlayerSummary[]
  disabled?: boolean
  totalCount?: number
  searchValue?: string
  onSearchChange?: (value: string) => void
}

function BenchPlayerCard({ player, disabled = false }: { player: LineupPlayerSummary; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: player.id,
    data: {
      player,
    },
    disabled,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), touchAction: 'none' }}
      className={cn(
        'flex items-center justify-between gap-3 rounded-2xl border border-[#0d62bf]/14 bg-[#0b1624]/92 px-4 py-3 shadow-sm transition will-change-transform',
        !disabled && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40 ring-2 ring-[#0d7ff2]/60'
      )}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl border border-[#0d62bf]/35 bg-[#09182a] text-sm font-bold text-[#7cb7ff]">
          {player.ea_gamertag.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{player.ea_gamertag}</p>
          <p className="text-xs text-[#738fb0]">
            {player.primary_position}
            {player.secondary_position ? ` / ${player.secondary_position}` : ''}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge className="border border-[#0d62bf]/30 bg-[#0d7ff2]/10 text-[#62acff]">
          Banco
        </Badge>
        <GripVertical className="size-4 text-[#56779f]" />
      </div>
    </div>
  )
}

export function RosterBench({
  players,
  disabled = false,
  totalCount,
  searchValue,
  onSearchChange,
}: RosterBenchProps) {
  return (
    <div className="rounded-[28px] border border-[#0d62bf]/20 bg-[#07111d] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.24)]">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[1.65rem] font-bold tracking-tight text-white">Banco de Reservas</h3>
          <p className="text-sm text-[#6d89ac]">Arraste jogadores para os slots compatíveis.</p>
        </div>
        <Badge className="border border-[#0d62bf]/30 bg-[#0d7ff2]/10 text-[#72b3ff]">
          {players.length}/{totalCount ?? players.length}
        </Badge>
      </div>

      {typeof searchValue === 'string' && onSearchChange ? (
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#53759d]" />
          <Input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar jogador..."
            className="border-[#0d62bf]/15 bg-[#081727] pl-9 text-white placeholder:text-[#56779f]"
          />
        </div>
      ) : null}

      <div className="grid gap-3">
        {players.length > 0 ? (
          players.map((player) => (
            <BenchPlayerCard key={player.id} player={player} disabled={disabled} />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-[#0d62bf]/20 px-4 py-8 text-center text-sm text-[#708db0]">
            Todos os jogadores elegíveis já estão em campo.
          </div>
        )}
      </div>
    </div>
  )
}
