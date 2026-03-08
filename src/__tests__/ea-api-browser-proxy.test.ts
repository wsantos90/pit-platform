import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('fetchMatchesRaw (browser_proxy)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it('chama o cookie-service e retorna matches do proxy', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ matches: [{ matchId: 'proxy-match-1' }] }),
    } as Response);

    vi.stubGlobal('fetch', mockFetch);

    process.env.EA_FETCH_TRANSPORT = 'browser_proxy';
    process.env.COOKIE_SERVICE_URL = 'https://cookie.menteembeta.com.br';
    process.env.COOKIE_SERVICE_SECRET = 'proxy-secret';

    const { fetchMatchesRaw } = await import('@/lib/ea/api');
    const result = await fetchMatchesRaw('1136016');

    expect(result).toEqual([{ matchId: 'proxy-match-1' }]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://cookie.menteembeta.com.br/api/ea/matches',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-secret': 'proxy-secret',
          Accept: 'application/json',
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('lança erro quando proxy retorna status não-2xx', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => '{"error":"ea_fetch_failed"}',
    } as unknown as Response);

    vi.stubGlobal('fetch', mockFetch);

    process.env.EA_FETCH_TRANSPORT = 'browser_proxy';
    process.env.COOKIE_SERVICE_URL = 'https://cookie.menteembeta.com.br';
    process.env.COOKIE_SERVICE_SECRET = 'proxy-secret';

    const { fetchMatchesRaw } = await import('@/lib/ea/api');

    await expect(fetchMatchesRaw('1136016')).rejects.toThrow(/Proxy browser respondeu 502/);
  });
});

