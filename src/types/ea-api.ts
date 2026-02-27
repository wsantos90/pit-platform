import type { EaPositionCategory } from './database';

/**
 * EA API Types — Tipos das respostas da API EA Sports
 * Princípio SSOT: Definição única dos shapes de resposta da API EA.
 *
 * Tipagem baseada na estrutura conhecida do endpoint:
 * GET proclubs.ea.com/api/fc/clubs/matches
 */

/** Dados brutos de um clube numa partida (valores retornados como string pela EA API) */
export interface EaRawClub {
    name: string;
    clubId: string;
    goals: string;
    goalsAgainst: string;
    teamId: string;
    winnerByDnf: string;
    wins: string;
    losses: string;
    ties: string;
    /** Resultado: "1" = vitória, "0" = derrota, "-1" = empate */
    result?: string;
}

/** Dados brutos de um jogador numa partida (valores retornados como string pela EA API) */
export interface EaRawPlayer {
    assists: string;
    cleansheetsany: string;
    goals: string;
    /** Man of the Match: "1" = sim */
    mom: string;
    passattempts: string;
    passesmade: string;
    /** Posição EA: "0"=GK, "1"=DEF, "2"=MID, "3"=ATK */
    pos: string;
    rating: string;
    saves: string;
    shots: string;
    tackleattempts: string;
    tacklesmade: string;
    vproattr?: string;
    vprohackreason?: string;
    playername?: string;
}

/** Dados agregados de um clube na partida */
export interface EaRawAggregate {
    assists: string;
    goals: string;
    passattempts: string;
    passesmade: string;
    pos: string;
    rating: string;
    shots: string;
    tackleattempts: string;
    tacklesmade: string;
}

/**
 * Shape de uma partida no array retornado pela EA API.
 * Os IDs de clube são as chaves dos objetos clubs/players/aggregate.
 */
export interface EaMatchRawResponse {
    matchId?: string;
    /** Unix timestamp (segundos) */
    timestamp?: number;
    /** Mapa clubId → dados do clube */
    clubs?: Record<string, EaRawClub>;
    /** Mapa clubId → (mapa gamertag → dados do jogador) */
    players?: Record<string, Record<string, EaRawPlayer>>;
    /** Mapa clubId → totais agregados do clube */
    aggregate?: Record<string, EaRawAggregate>;
}

export interface EaParsedClub {
    eaClubId: string;
    nameRaw: string;
    nameDisplay: string;
    goals: number;
    goalsAgainst: number;
    wins: number;
    losses: number;
    ties: number;
    winnerByDnf: number;
    result: number | null;
}

export interface EaParsedMatchPlayer {
    eaClubId: string;
    gamertag: string;
    playerName: string;
    position: EaPositionCategory;
    goals: number;
    assists: number;
    rating: number | null;
    passesAttempted: number;
    passesMade: number;
    tacklesAttempted: number;
    tacklesMade: number;
    shots: number;
    shotsOnTarget: number;
    yellowCards: number;
    redCards: number;
    cleanSheets: number;
    saves: number;
    manOfMatch: boolean;
    minutesPlayed: number;
}

export interface EaParsedMatch {
    matchId: string;
    timestampUtc: Date;
    timestampBrasilia: string;
    homeClubId: string;
    awayClubId: string;
    homeClubName: string;
    awayClubName: string;
    homeScore: number;
    awayScore: number;
    clubs: Record<string, EaParsedClub>;
    players: EaParsedMatchPlayer[];
}

// ─── Tipos legados mantidos para retrocompatibilidade ───────────────────────

export interface EaMatchResponse {
    [key: string]: unknown;
}

export interface EaClubInfoResponse {
    [key: string]: unknown;
}

export interface EaMemberStatsResponse {
    [key: string]: unknown;
}

export interface EaSearchResponse {
    [key: string]: unknown;
}
