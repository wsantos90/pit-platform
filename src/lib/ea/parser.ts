/**
 * EA API Response Parser
 *
 * Transforma respostas brutas da API EA em objetos tipados
 * usados pela aplicação.
 *
 * Princípio SRP: Apenas parsing/transformação de dados.
 * Princípio DRY: Um único lugar para transformar dados EA.
 */

import { formatInTimeZone } from 'date-fns-tz';
import { z } from 'zod';
import { normalizeClubName } from './normalize';
import type { EaPositionCategory } from '@/types/database';
import type {
    EaParsedClub,
    EaParsedMatch,
    EaParsedMatchPlayer,
} from '@/types/ea-api';

const rawClubSchema = z.object({
    name: z.string(),
    clubId: z.string(),
    goals: z.string(),
    goalsAgainst: z.string(),
    teamId: z.string(),
    winnerByDnf: z.string(),
    wins: z.string(),
    losses: z.string(),
    ties: z.string(),
    result: z.string().optional(),
}).passthrough();

const rawPlayerSchema = z.object({
    assists: z.string(),
    cleansheetsany: z.string(),
    goals: z.string(),
    mom: z.string(),
    passattempts: z.string(),
    passesmade: z.string(),
    pos: z.string(),
    rating: z.string(),
    saves: z.string(),
    shots: z.string(),
    tackleattempts: z.string(),
    tacklesmade: z.string(),
}).passthrough();

const matchSchema = z.object({
    matchId: z.string(),
    timestamp: z.number(),
    clubs: z.record(rawClubSchema),
    players: z.record(z.record(rawPlayerSchema)),
}).passthrough();

const matchResponseSchema = z.array(matchSchema);

/** Parsear resposta de partida da EA API */
export function parseMatchResponse(raw: unknown, primaryClubId?: string): EaParsedMatch[] {
    return parseMatches(raw, primaryClubId);
}

/** Parsear resposta de info do time */
export function parseClubInfoResponse(raw: unknown): unknown {
    return raw;
}

/** Parsear resposta de membros do time */
export function parseMembersResponse(raw: unknown): unknown {
    return raw;
}

export function parseMatches(raw: unknown, primaryClubId?: string): EaParsedMatch[] {
    const parsed = matchResponseSchema.safeParse(raw);
    if (!parsed.success) {
        const details = parsed.error.issues
            .map(issue => `${issue.path.join('.') || 'root'}: ${issue.message}`)
            .join('; ');
        throw new Error(`EA parser: resposta inválida (${details})`);
    }

    return parsed.data.map((match, index) => {
        const clubIds = Object.keys(match.clubs);
        if (clubIds.length < 2) {
            throw new Error(`EA parser: match sem dois clubes (index=${index})`);
        }

        const homeClubId = primaryClubId && clubIds.includes(primaryClubId)
            ? primaryClubId
            : clubIds[0];
        const awayClubId = clubIds.find(clubId => clubId !== homeClubId) ?? clubIds[1];

        const homeClubRaw = match.clubs[homeClubId];
        const awayClubRaw = match.clubs[awayClubId];

        if (!homeClubRaw || !awayClubRaw) {
            throw new Error(`EA parser: clubes inválidos para matchId=${match.matchId}`);
        }

        const clubs = Object.entries(match.clubs).reduce<Record<string, EaParsedClub>>((acc, [clubId, club]) => {
            acc[clubId] = {
                eaClubId: clubId,
                nameRaw: club.name,
                nameDisplay: normalizeClubName(club.name),
                goals: toNumber(club.goals),
                goalsAgainst: toNumber(club.goalsAgainst),
                wins: toNumber(club.wins),
                losses: toNumber(club.losses),
                ties: toNumber(club.ties),
                winnerByDnf: toNumber(club.winnerByDnf),
                result: toNumberOrNull(club.result),
            };
            return acc;
        }, {});

        const players = Object.entries(match.players).flatMap(([clubId, clubPlayers]) => {
            return Object.entries(clubPlayers).map(([gamertag, player]) => {
                const playerRecord = player as Record<string, unknown>;
                const position = parsePositionCategory(player.pos);
                const playerName = typeof player.playername === 'string' && player.playername.trim()
                    ? player.playername
                    : gamertag;

                return {
                    eaClubId: clubId,
                    gamertag,
                    playerName,
                    position,
                    goals: toNumber(player.goals),
                    assists: toNumber(player.assists),
                    rating: toNumberOrNull(player.rating),
                    passesAttempted: toNumber(player.passattempts),
                    passesMade: toNumber(player.passesmade),
                    tacklesAttempted: toNumber(player.tackleattempts),
                    tacklesMade: toNumber(player.tacklesmade),
                    shots: toNumber(player.shots),
                    shotsOnTarget: toNumber(getValue(playerRecord, [
                        'shotsontarget',
                        'shotsOnTarget',
                        'shotsonTarget',
                    ])),
                    yellowCards: toNumber(getValue(playerRecord, [
                        'yellowcards',
                        'yellowCards',
                        'yellowcard',
                    ])),
                    redCards: toNumber(getValue(playerRecord, [
                        'redcards',
                        'redCards',
                        'redcard',
                    ])),
                    cleanSheets: toNumber(player.cleansheetsany),
                    saves: toNumber(player.saves),
                    manOfMatch: toBoolean(player.mom),
                    minutesPlayed: toNumber(getValue(playerRecord, [
                        'minutes',
                        'minutesplayed',
                        'minsplayed',
                        'minsPlayed',
                    ])),
                } satisfies EaParsedMatchPlayer;
            });
        });

        const timestampUtc = new Date(match.timestamp * 1000);
        const timestampBrasilia = formatInTimeZone(
            timestampUtc,
            'America/Sao_Paulo',
            "yyyy-MM-dd'T'HH:mm:ssXXX"
        );

        return {
            matchId: match.matchId,
            timestampUtc,
            timestampBrasilia,
            homeClubId,
            awayClubId,
            homeClubName: clubs[homeClubId]?.nameDisplay ?? normalizeClubName(homeClubRaw.name),
            awayClubName: clubs[awayClubId]?.nameDisplay ?? normalizeClubName(awayClubRaw.name),
            homeScore: toNumber(homeClubRaw.goals),
            awayScore: toNumber(awayClubRaw.goals),
            clubs,
            players,
        } satisfies EaParsedMatch;
    });
}

function toNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') return 0;
    const numeric = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
}

function toNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const numeric = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numeric) ? numeric : null;
}

function toBoolean(value: unknown): boolean {
    return value === '1' || value === 1 || value === true;
}

function parsePositionCategory(value: string): EaPositionCategory {
    const normalized = value.trim();
    if (normalized === '0') return 'goalkeeper';
    if (normalized === '1') return 'defender';
    if (normalized === '2') return 'midfielder';
    if (normalized === '3') return 'forward';
    // Fallback robusto: posição desconhecida não deve derrubar o parse de toda a partida
    console.warn(`EA parser: posição desconhecida "${value}", usando 'forward' como fallback`);
    return 'forward';
}

function getValue(record: Record<string, unknown>, keys: string[]): unknown {
    for (const key of keys) {
        if (key in record) return record[key];
    }
    return undefined;
}
