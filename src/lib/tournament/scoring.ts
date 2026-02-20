/**
 * Tournament Scoring
 * Princípio SRP: Apenas cálculos de pontuação de torneios.
 */

// TODO: Implementar scoring conforme regras do schema doc

/** Calcular pontuação de grupo (round robin) */
export function calculateGroupStandings(/* TODO */): unknown {
    // TODO: Implementar standings de grupo
    return {};
}

/** Calcular prize pool e distribuição */
export function calculatePrizeDistribution(
    entryFee: number,
    teamCount: number
): { champion: number; runnerUp: number; platform: number } {
    // TODO: Implementar distribuição de premiação
    const totalPool = entryFee * teamCount;
    return {
        champion: totalPool * 0.6,
        runnerUp: totalPool * 0.25,
        platform: totalPool * 0.15,
    };
}
