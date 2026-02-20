/**
 * Player Position Resolution
 *
 * Resolver posição detalhada (7 posições PIT) a partir da
 * categoria genérica da API EA (4 categorias).
 *
 * Princípio SRP: Apenas resolução de posição.
 * Ref: FC10 — Position Resolution
 */

type EaPositionCategory = 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
type PitPosition = 'GK' | 'ZAG' | 'VOL' | 'MC' | 'AE' | 'AD' | 'ATA';

/** Mapa de categorias EA → posições PIT válidas */
const POSITION_MAP: Record<EaPositionCategory, PitPosition[]> = {
    goalkeeper: ['GK'],
    defender: ['ZAG'],
    midfielder: ['VOL', 'MC', 'AE', 'AD'],
    forward: ['ATA'],
};

/**
 * Resolver posição detalhada do jogador.
 * Prioridade: posição primária → posição secundária → fallback da categoria
 */
export function resolvePosition(
    eaCategory: EaPositionCategory,
    primaryPosition: PitPosition,
    secondaryPosition?: PitPosition | null
): PitPosition {
    const validPositions = POSITION_MAP[eaCategory];

    // Se posição primária pertence a esta categoria → usar primária
    if (validPositions.includes(primaryPosition)) {
        return primaryPosition;
    }

    // Se posição secundária pertence a esta categoria → usar secundária
    if (secondaryPosition && validPositions.includes(secondaryPosition)) {
        return secondaryPosition;
    }

    // Fallback: primeira posição válida da categoria
    return validPositions[0];
}

export { POSITION_MAP };
export type { EaPositionCategory, PitPosition };
