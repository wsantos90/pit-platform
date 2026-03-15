'use client'

import { useDroppable } from '@dnd-kit/core'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  FORMATION_352_SLOTS,
  getSlotById,
  type PlayerInPosition,
  type PositionId,
} from '@/lib/lineups'
import { Button } from '@/components/ui/button'

export interface LineupVisualProps {
  players?: PlayerInPosition[]
  onPositionClick?: (positionId: PositionId) => void
  onRemovePlayer?: (positionId: PositionId) => void
  readOnly?: boolean
}

type SlotProps = {
  assignment: PlayerInPosition
  readOnly: boolean
  onPositionClick?: (positionId: PositionId) => void
  onRemovePlayer?: (positionId: PositionId) => void
}

function getPlayerLabel(name: string) {
  return name.length > 14 ? `${name.slice(0, 14)}...` : name
}

function FieldSlot({ assignment, onPositionClick, onRemovePlayer, readOnly }: SlotProps) {
  const slot = getSlotById(assignment.positionId)
  const { setNodeRef, isOver } = useDroppable({
    id: slot.id,
    disabled: readOnly,
  })

  return (
    <div
      ref={setNodeRef}
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => onPositionClick?.(slot.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onPositionClick?.(slot.id)
          }
        }}
        className={cn(
          'group relative flex w-[92px] flex-col items-center text-center transition-all duration-150 lg:w-[98px]',
          isOver && !readOnly && 'scale-105'
        )}
      >
        <div
          className={cn(
            'relative flex size-11 items-center justify-center rounded-full border text-sm font-black shadow-[0_0_24px_rgba(13,127,242,0.15)] transition-all lg:size-12',
            assignment.player
              ? 'border-[#4a91ff] bg-[radial-gradient(circle_at_top,_rgba(44,144,255,0.25),rgba(6,17,28,0.96))] text-white'
              : 'border-[#2d5da1] bg-[radial-gradient(circle_at_center,_rgba(13,127,242,0.14),rgba(5,13,23,0.96))] text-[#8db9ff]',
            isOver && !readOnly && 'border-[#78b2ff] shadow-[0_0_32px_rgba(66,153,255,0.32)]'
          )}
        >
          {slot.shortLabel}
          {assignment.player && !readOnly ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute -right-1 -top-1 size-5 rounded-full border border-[#244b86] bg-[#071220] p-0 text-[#8db9ff] hover:bg-[#0c2038] hover:text-white"
              onClick={(event) => {
                event.stopPropagation()
                onRemovePlayer?.(slot.id)
              }}
            >
              <X className="size-3" />
            </Button>
          ) : null}
        </div>

        <div className="mt-2 flex flex-col items-center gap-1">
          {assignment.player ? (
            <div className="rounded-md bg-[#0b1320]/95 px-2 py-1 text-[10px] font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.28)]">
              {getPlayerLabel(assignment.player.ea_gamertag)}
            </div>
          ) : null}
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#76b0ff]">
            {slot.label}
          </p>
        </div>
      </div>
    </div>
  )
}

export function LineupVisual({
  players = [],
  onPositionClick,
  onRemovePlayer,
  readOnly = false,
}: LineupVisualProps) {
  const assignments = FORMATION_352_SLOTS.map((slot) => {
    return players.find((player) => player.positionId === slot.id) ?? { positionId: slot.id, player: null }
  })

  return (
    <div className="rounded-[32px] border border-[#15345d] bg-[linear-gradient(180deg,_rgba(5,12,22,0.96),_rgba(3,8,16,0.98))] p-4 shadow-[0_32px_80px_rgba(0,0,0,0.3)] lg:p-5">
      <div
        className="relative mx-auto h-[clamp(500px,68vh,760px)] w-full max-w-[590px] overflow-hidden rounded-[26px] border border-[#23436f] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),transparent_28%),linear-gradient(90deg,_rgba(255,255,255,0.03),transparent_30%,transparent_70%,rgba(255,255,255,0.03)),linear-gradient(180deg,_#10253f_0%,_#0a1b31_45%,_#061425_100%)] sm:max-w-[620px] xl:max-w-[640px]"
        style={{ aspectRatio: '4 / 5' }}
      >
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
          preserveAspectRatio="none"
        >
          <rect x="3" y="3" width="94" height="94" rx="2" fill="none" stroke="rgba(121,162,219,0.48)" strokeWidth="0.7" />
          <line x1="3" y1="50" x2="97" y2="50" stroke="rgba(121,162,219,0.26)" strokeWidth="0.7" />
          <line x1="50" y1="3" x2="50" y2="97" stroke="rgba(121,162,219,0.16)" strokeWidth="0.55" />
          <circle cx="50" cy="50" r="9.5" fill="none" stroke="rgba(121,162,219,0.26)" strokeWidth="0.65" />
          <circle cx="50" cy="50" r="0.8" fill="rgba(164,203,255,0.32)" />
          <rect x="20" y="3" width="60" height="16" fill="none" stroke="rgba(121,162,219,0.22)" strokeWidth="0.6" />
          <rect x="35" y="3" width="30" height="8" fill="none" stroke="rgba(121,162,219,0.22)" strokeWidth="0.6" />
          <rect x="20" y="81" width="60" height="16" fill="none" stroke="rgba(121,162,219,0.22)" strokeWidth="0.6" />
          <rect x="35" y="89" width="30" height="8" fill="none" stroke="rgba(121,162,219,0.22)" strokeWidth="0.6" />
        </svg>

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(255,255,255,0.02)_100%)]" />

        <div className="absolute inset-0">
          {assignments.map((assignment) => (
            <FieldSlot
              key={assignment.positionId}
              assignment={assignment}
              onPositionClick={onPositionClick}
              onRemovePlayer={onRemovePlayer}
              readOnly={readOnly}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
