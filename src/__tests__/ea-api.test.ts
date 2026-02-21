import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMatchesRaw } from '@/lib/ea/api';

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

        it('tenta 3 vezes e lança erro após todas as falhas', async () => {
            mockFetch
                .mockRejectedValueOnce(new Error('fail 1'))
                .mockRejectedValueOnce(new Error('fail 2'))
                .mockRejectedValueOnce(new Error('fail 3'));

            const resultPromise = fetchMatchesRaw('637741');
            // Registra o handler ANTES de avançar os timers para evitar unhandled rejection
            const assertion = expect(resultPromise).rejects.toThrow(
                /Todas as 3 tentativas falharam/
            );
            await vi.advanceTimersByTimeAsync(1000);
            await vi.advanceTimersByTimeAsync(2000);
            await assertion;

            expect(mockFetch).toHaveBeenCalledTimes(3);
        });

        it('lança erro com status HTTP quando a API responde com erro', async () => {
            mockFetch.mockResolvedValue(mockResponse(null, 403));

            const resultPromise = fetchMatchesRaw('637741');
            // Registra o handler ANTES de avançar os timers
            const assertion = expect(resultPromise).rejects.toThrow(
                /Todas as 3 tentativas falharam/
            );
            await vi.advanceTimersByTimeAsync(1000);
            await vi.advanceTimersByTimeAsync(2000);
            await assertion;
        });
    });
});
