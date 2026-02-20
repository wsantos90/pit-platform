/**
 * ELO Rating Calculator
 *
 * Cálculo de Pit Rating (Fase 2).
 * Implementa sistema ELO adaptado para Pro Clubs.
 *
 * Princípio SRP: Apenas cálculos de rating.
 * Princípio KISS: ELO padrão com K-factor ajustável.
 */

const DEFAULT_RATING = 1500;
const K_FACTOR_CALIBRATING = 64;
const K_FACTOR_STANDARD = 32;
const CALIBRATION_MATCHES = 10;

/** Resultado da partida: 1 = vitória, 0.5 = empate, 0 = derrota */
type MatchResult = 1 | 0.5 | 0;

/** Calcular expectativa de vitória baseado nos ratings */
export function expectedScore(ratingA: number, ratingB: number): number {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/** Calcular delta de ELO após uma partida */
export function calculateDelta(
    ratingA: number,
    ratingB: number,
    result: MatchResult,
    isCalibrating: boolean = false
): number {
    const kFactor = isCalibrating ? K_FACTOR_CALIBRATING : K_FACTOR_STANDARD;
    const expected = expectedScore(ratingA, ratingB);
    return Math.round(kFactor * (result - expected));
}

/** Determinar liga baseado no rating */
export function determineLeague(rating: number): string {
    if (rating >= 2000) return 'elite';
    if (rating >= 1800) return 'gold';
    if (rating >= 1600) return 'silver';
    if (rating >= 1400) return 'bronze';
    return 'access';
}

export { DEFAULT_RATING, CALIBRATION_MATCHES };
