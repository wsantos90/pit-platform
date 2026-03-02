import type { EaPositionCategory, PlayerPosition } from '@/types/database';

/**
 * Player Position Resolution
 *
 * Resolve posicao detalhada (7 posicoes PIT) a partir da
 * categoria generica da API EA (4 categorias).
 */

type PitPosition = PlayerPosition;

/** Todas as posicoes PIT, em ordem de campo (SSOT) */
export const PLAYER_POSITIONS = ['GK', 'ZAG', 'VOL', 'MC', 'AE', 'AD', 'ATA'] as const satisfies readonly PlayerPosition[];

/** Mapa de categorias EA -> posicoes PIT validas */
const POSITION_MAP: Record<EaPositionCategory, PitPosition[]> = {
    goalkeeper: ['GK'],
    defender: ['ZAG'],
    midfielder: ['VOL', 'MC', 'AE', 'AD'],
    forward: ['ATA'],
};

/**
 * Resolve posicao detalhada do jogador.
 * Prioridade: posicao primaria -> posicao secundaria -> fallback da categoria.
 */
export function resolvePosition(
    eaCategory: EaPositionCategory,
    primaryPosition: PitPosition,
    secondaryPosition?: PitPosition | null
): PitPosition {
    const validPositions = POSITION_MAP[eaCategory];

    if (validPositions.includes(primaryPosition)) {
        return primaryPosition;
    }

    if (secondaryPosition && validPositions.includes(secondaryPosition)) {
        return secondaryPosition;
    }

    return validPositions[0];
}

export const mapPosition = resolvePosition;

export { POSITION_MAP };
