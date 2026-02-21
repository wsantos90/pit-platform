import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMatches, fetchMatchesRaw } from '@/lib/ea/api';

// Mock do Discovery para isolar o cliente HTTP dos efeitos colaterais de BD
vi.mock('@/lib/ea/discovery', () => ({
    upsertDiscoveredClub: vi.fn().mockResolvedValue(undefined),
}));

// Mock do Admin Client para não exigir SUPABASE_SERVICE_ROLE_KEY nos testes
vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: vi.fn().mockReturnValue({}),
}));

// Mock global fetch
const mockFetch = vi.fn();

beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    vi.useFakeTimers();
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});

/** Helper: cria uma resposta fetch simulada com sucesso */
function mockResponse(data: unknown, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        statusText: status === 200 ? 'OK' : 'Error',
        json: () => Promise.resolve(data),
    } as Response;
}

const MOCK_MATCH_DATA = [{ matchId: 'abc123', timestamp: 1700000000 }];
const MOCK_MATCH_RESPONSE = [
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

describe('fetchMatchesRaw', () => {
    describe('Sucesso', () => {
        it('retorna o JSON bruto na 1ª tentativa', async () => {
            mockFetch.mockResolvedValueOnce(mockResponse(MOCK_MATCH_DATA));

            const resultPromise = fetchMatchesRaw('637741');
            await vi.runAllTimersAsync();
            const result = await resultPromise;

            expect(result).toEqual(MOCK_MATCH_DATA);
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        it('monta a URL corretamente com clubId e maxResultCount=10', async () => {
            mockFetch.mockResolvedValueOnce(mockResponse([]));

            const resultPromise = fetchMatchesRaw('99999');
            await vi.runAllTimersAsync();
            await resultPromise;

            const calledUrl = mockFetch.mock.calls[0][0] as string;
            expect(calledUrl).toContain('clubIds=99999');
            expect(calledUrl).toContain('maxResultCount=10');
            expect(calledUrl).toContain('platform=common-gen5');
        });
    });

    describe('Headers e Cookies', () => {
        it('inclui User-Agent, Accept e Accept-Language nos headers', async () => {
            mockFetch.mockResolvedValueOnce(mockResponse([]));

            const resultPromise = fetchMatchesRaw('637741');
            await vi.runAllTimersAsync();
            await resultPromise;

            const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
            expect(headers['User-Agent']).toMatch(/Mozilla/);
            expect(headers['Accept']).toBe('application/json');
            expect(headers['Accept-Language']).toMatch(/pt-BR/);
        });

        it('inclui header Cookie quando cookies são fornecidos', async () => {
            mockFetch.mockResolvedValueOnce(mockResponse([]));
            const cookies = 'ak_bmsc=abc123; bm_sv=xyz789';

            const resultPromise = fetchMatchesRaw('637741', cookies);
            await vi.runAllTimersAsync();
            await resultPromise;

            const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
            expect(headers['Cookie']).toBe(cookies);
        });

        it('não inclui header Cookie quando cookies são omitidos', async () => {
            mockFetch.mockResolvedValueOnce(mockResponse([]));

            const resultPromise = fetchMatchesRaw('637741');
            await vi.runAllTimersAsync();
            await resultPromise;

            const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
            expect(headers['Cookie']).toBeUndefined();
        });
    });

    describe('Retry Logic', () => {
        it('tenta novamente após 1 falha e retorna sucesso na 2ª tentativa', async () => {
            mockFetch
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce(mockResponse(MOCK_MATCH_DATA));

            const resultPromise = fetchMatchesRaw('637741');
            // Avança o timer do backoff da 1ª retry (1000ms)
            await vi.advanceTimersByTimeAsync(1000);
            const result = await resultPromise;

            expect(result).toEqual(MOCK_MATCH_DATA);
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });

        it('tenta 4 vezes e lança erro após todas as falhas', async () => {
            mockFetch
                .mockRejectedValueOnce(new Error('fail 1'))
                .mockRejectedValueOnce(new Error('fail 2'))
                .mockRejectedValueOnce(new Error('fail 3'))
                .mockRejectedValueOnce(new Error('fail 4'));

            const resultPromise = fetchMatchesRaw('637741');
            // Registra o handler ANTES de avançar os timers
            const assertion = expect(resultPromise).rejects.toThrow(
                /Todas as 4 tentativas falharam/
            );
            await vi.advanceTimersByTimeAsync(1000); // retry 1
            await vi.advanceTimersByTimeAsync(2000); // retry 2
            await vi.advanceTimersByTimeAsync(4000); // retry 3
            await assertion;

            expect(mockFetch).toHaveBeenCalledTimes(4);
        });

        it('lança erro com status HTTP quando a API responde com erro', async () => {
            mockFetch.mockResolvedValue(mockResponse(null, 403));

            const resultPromise = fetchMatchesRaw('637741');
            const assertion = expect(resultPromise).rejects.toThrow(
                /Todas as 4 tentativas falharam/
            );
            await vi.advanceTimersByTimeAsync(1000);
            await vi.advanceTimersByTimeAsync(2000);
            await vi.advanceTimersByTimeAsync(4000);
            await assertion;
        });
    });
});

describe('fetchMatches', () => {
    it('retorna partidas parseadas e normalizadas', async () => {
        mockFetch.mockResolvedValueOnce(mockResponse(MOCK_MATCH_RESPONSE));

        const resultPromise = fetchMatches('100');
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result).toHaveLength(1);
        expect(result[0].homeClubId).toBe('100');
        expect(result[0].homeClubName).toBe('Cássia');
        expect(result[0].awayClubName).toBe('Athética');
    });
});
