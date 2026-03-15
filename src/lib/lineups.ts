import type { LineupPlayer, PlayerPosition } from '@/types/database'

export type PositionId =
  | 'GK'
  | 'ZAG1'
  | 'ZAG2'
  | 'ZAG3'
  | 'VOL1'
  | 'VOL2'
  | 'MC'
  | 'AE'
  | 'AD'
  | 'ATA1'
  | 'ATA2'

export type LineupPlayerSummary = {
  id: string
  ea_gamertag: string
  primary_position: PlayerPosition
  secondary_position: PlayerPosition | null
}

export type PlayerInPosition = {
  positionId: PositionId
  player: LineupPlayerSummary | null
}

export type FormationSlot = {
  id: PositionId
  label: string
  shortLabel: string
  playerPosition: PlayerPosition
  x: number
  y: number
}

export const FORMATION_352_SLOT_ID_VALUES = [
  'GK',
  'ZAG1',
  'ZAG2',
  'ZAG3',
  'VOL1',
  'VOL2',
  'MC',
  'AE',
  'AD',
  'ATA1',
  'ATA2',
] as const satisfies readonly PositionId[]

export const FORMATION_352_SLOTS: FormationSlot[] = [
  { id: 'GK', label: 'Goleiro', shortLabel: 'GK', playerPosition: 'GK', x: 50, y: 88 },
  { id: 'ZAG1', label: 'Zagueiro E', shortLabel: 'ZAG', playerPosition: 'ZAG', x: 25, y: 72 },
  { id: 'ZAG2', label: 'Zagueiro C', shortLabel: 'ZAG', playerPosition: 'ZAG', x: 50, y: 72 },
  { id: 'ZAG3', label: 'Zagueiro D', shortLabel: 'ZAG', playerPosition: 'ZAG', x: 75, y: 72 },
  { id: 'VOL1', label: 'Volante E', shortLabel: 'VOL', playerPosition: 'VOL', x: 20, y: 54 },
  { id: 'VOL2', label: 'Volante D', shortLabel: 'VOL', playerPosition: 'VOL', x: 80, y: 54 },
  { id: 'MC', label: 'Meia C', shortLabel: 'MC', playerPosition: 'MC', x: 50, y: 50 },
  { id: 'AE', label: 'Ala E', shortLabel: 'AE', playerPosition: 'AE', x: 15, y: 32 },
  { id: 'AD', label: 'Ala D', shortLabel: 'AD', playerPosition: 'AD', x: 85, y: 32 },
  { id: 'ATA1', label: 'Atacante E', shortLabel: 'ATA', playerPosition: 'ATA', x: 35, y: 15 },
  { id: 'ATA2', label: 'Atacante D', shortLabel: 'ATA', playerPosition: 'ATA', x: 65, y: 15 },
]

export const FORMATION_352_SLOT_IDS = FORMATION_352_SLOTS.map((slot) => slot.id)

export function getSlotById(positionId: PositionId) {
  return FORMATION_352_SLOTS.find((slot) => slot.id === positionId)!
}

export function createEmptyLineup(): PlayerInPosition[] {
  return FORMATION_352_SLOTS.map((slot) => ({
    positionId: slot.id,
    player: null,
  }))
}

export function buildLineupPlayers(
  players: Array<Partial<PlayerInPosition> & { positionId: PositionId }>
): PlayerInPosition[] {
  const byPosition = new Map(players.map((player) => [player.positionId, player.player ?? null]))

  return FORMATION_352_SLOTS.map((slot) => ({
    positionId: slot.id,
    player: byPosition.get(slot.id) ?? null,
  }))
}

export function isPlayerValidForSlot(player: LineupPlayerSummary, positionId: PositionId) {
  const slot = getSlotById(positionId)

  return (
    player.primary_position === slot.playerPosition ||
    player.secondary_position === slot.playerPosition
  )
}

export function lineupAssignmentsToPayload(players: PlayerInPosition[]) {
  return players
    .filter((item): item is PlayerInPosition & { player: LineupPlayerSummary } => item.player !== null)
    .map((item, index) => ({
      player_id: item.player.id,
      position: getSlotById(item.positionId).playerPosition,
      slot_id: item.positionId,
      is_starter: true,
      sort_order: index,
    }))
}

export function mapLineupPlayersToAssignments(
  lineupPlayers: Array<
    Pick<LineupPlayer, 'position' | 'slot_id'> & {
      player: LineupPlayerSummary | null
    }
  >
) {
  return buildLineupPlayers(
    lineupPlayers
      .filter(
        (lineupPlayer): lineupPlayer is typeof lineupPlayer & {
          slot_id: PositionId
          player: LineupPlayerSummary
        } => Boolean(lineupPlayer.slot_id && lineupPlayer.player)
      )
      .map((lineupPlayer) => ({
        positionId: lineupPlayer.slot_id,
        player: lineupPlayer.player,
      }))
  )
}

export function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}
