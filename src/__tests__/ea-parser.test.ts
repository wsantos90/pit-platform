import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';
import { parseMatches } from '@/lib/ea/parser';

const RAW_MATCH_RESPONSE = [
    {
        matchId: 'match-001',
        timestamp: 1700000000,
        clubs: {
            '100': {
                name: 'CÃ¡ssia',
                clubId: '100',
                goals: '2',
                goalsAgainst: '1',
                teamId: '1',
                winnerByDnf: '0',
                wins: '0',
                losses: '0',
                ties: '0',
                result: '1',
            },
            '200': {
                name: 'AthÃ©tica',
                clubId: '200',
                goals: '1',
                goalsAgainst: '2',
                teamId: '2',
                winnerByDnf: '0',
                wins: '0',
                losses: '0',
                ties: '0',
                result: '0',
            },
        },
        players: {
            '100': {
                PlayerOne: {
                    assists: '1',
                    cleansheetsany: '0',
                    goals: '2',
                    mom: '1',
                    passattempts: '10',
                    passesmade: '8',
                    pos: '2',
                    rating: '7.5',
                    saves: '0',
                    shots: '4',
                    tackleattempts: '3',
                    tacklesmade: '2',
                    yellowcards: '1',
                    redcards: '0',
                    minutes: '90',
                },
            },
            '200': {
                PlayerTwo: {
                    assists: '0',
                    cleansheetsany: '0',
                    goals: '1',
                    mom: '0',
                    passattempts: '5',
                    passesmade: '4',
                    pos: '3',
                    rating: '6.8',
                    saves: '0',
                    shots: '2',
                    tackleattempts: '1',
                    tacklesmade: '1',
                },
            },
        },
    },
];

describe('parseMatches', () => {
    it('parseia partidas, normaliza nomes e converte timestamp para Brasília', () => {
        const result = parseMatches(RAW_MATCH_RESPONSE, '100');

        expect(result).toHaveLength(1);
        const match = result[0];

        expect(match.matchId).toBe('match-001');
        expect(match.homeClubId).toBe('100');
        expect(match.awayClubId).toBe('200');
        expect(match.homeClubName).toBe('Cássia');
        expect(match.awayClubName).toBe('Athética');
        expect(match.homeScore).toBe(2);
        expect(match.awayScore).toBe(1);
        expect(match.timestampBrasilia).toBe('2023-11-14T19:13:20-03:00');
        expect(match.players).toHaveLength(2);
    });

    it('lança erro quando resposta não é um array válido', () => {
        expect(() => parseMatches({})).toThrow(/resposta inválida/);
    });

    it('usa fallback "forward" para posição desconhecida sem lançar erro', () => {
        const withUnknownPos = [
            {
                ...RAW_MATCH_RESPONSE[0],
                players: {
                    '100': {
                        PlayerOne: {
                            ...RAW_MATCH_RESPONSE[0].players['100'].PlayerOne,
                            pos: '9', // posição desconhecida — não deve derrubar o parse
                        },
                    },
                    '200': RAW_MATCH_RESPONSE[0].players['200'],
                },
            },
        ];

        const result = parseMatches(withUnknownPos);
        expect(result).toHaveLength(1);
        const playerWithUnknownPos = result[0].players.find(p => p.gamertag === 'PlayerOne');
        expect(playerWithUnknownPos?.position).toBe('forward');
    });

    it('processa volumes maiores de dados dentro do limite esperado', () => {
        const baseMatch = RAW_MATCH_RESPONSE[0];
        const largeBatch = Array.from({ length: 1000 }, (_, index) => ({
            ...baseMatch,
            matchId: `match-${index}`,
            timestamp: baseMatch.timestamp + index,
        }));

        const start = performance.now();
        const result = parseMatches(largeBatch, '100');
        const durationMs = performance.now() - start;

        expect(result).toHaveLength(1000);
        expect(durationMs).toBeLessThan(1000);
    });
});
