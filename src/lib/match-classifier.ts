/**
 * Match Classifier
 *
 * Classifica partidas da API EA (friendlyMatch genérico) em tipos internos.
 * Ref: FC05 — Match Classification
 *
 * Princípio SRP: Apenas classificação de partidas.
 * Princípio OCP: Adicionar novos critérios sem alterar a lógica existente.
 */

type MatchType = 'championship' | 'friendly_pit' | 'friendly_external';

interface MatchClassificationInput {
    matchId: string;
    homeClubId: string;
    awayClubId: string;
    timestamp: Date;
    activeTournamentClubIds?: string[];
    activeMatchmakingClubIds?: string[];
}

/**
 * Classificar uma partida baseado nos contextos ativos.
 *
 * Ordem de prioridade:
 * 1. Ambos os times estão em um bracket de torneio ativo → 'championship'
 * 2. Ambos os times estão em confronto de matchmaking → 'friendly_pit'
 * 3. Caso contrário → 'friendly_external'
 */
export function classifyMatch(input: MatchClassificationInput): MatchType {
    const { homeClubId, awayClubId, activeTournamentClubIds = [], activeMatchmakingClubIds = [] } = input;

    // Checar se é partida de campeonato
    const bothInTournament =
        activeTournamentClubIds.includes(homeClubId) &&
        activeTournamentClubIds.includes(awayClubId);
    if (bothInTournament) return 'championship';

    // Checar se é amistoso PIT (matchmaking)
    const bothInMatchmaking =
        activeMatchmakingClubIds.includes(homeClubId) &&
        activeMatchmakingClubIds.includes(awayClubId);
    if (bothInMatchmaking) return 'friendly_pit';

    // Fallback: amistoso externo
    return 'friendly_external';
}

export type { MatchType, MatchClassificationInput };
