/**
 * EA Sports FC API — Client
 * Integração com a API de Pro Clubs da EA
 *
 * Princípio SSOT: Todas as chamadas à API EA passam por este módulo.
 * Princípio SRP: Este arquivo cuida APENAS de fetch HTTP da API EA.
 */

const EA_BASE_URL = process.env.EA_API_BASE_URL || 'https://proclubs.ea.com/api/fc';
const EA_PLATFORM = process.env.EA_PLATFORM || 'common-gen5';

/** Tempos de espera para retry: 1s, 2s, 4s (backoff exponencial) */
const RETRY_BACKOFF_MS = [1000, 2000, 4000] as const;

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/** Headers obrigatórios para a API EA; cookies Akamai opcionais */
function getEAHeaders(cookies?: string): Record<string, string> {
    const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    };
    if (cookies) headers['Cookie'] = cookies;
    return headers;
}

/**
 * Faz GET na API EA para buscar partidas brutas de um time.
 * Retry com backoff exponencial (3 tentativas: 1s → 2s → 4s).
 *
 * @param clubId  - ID do clube EA (ex: "637741")
 * @param cookies - Cookie string Akamai: "ak_bmsc=abc; bm_sv=xyz" (opcional)
 * @returns       - JSON bruto da resposta EA (array de partidas)
 */
export async function fetchMatchesRaw(
    clubId: string,
    cookies?: string
): Promise<unknown> {
    const url = `${EA_BASE_URL}/clubs/matches?platform=${EA_PLATFORM}&clubIds=${clubId}&maxResultCount=10&matchType=friendlyMatch`;
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
            const waitMs = RETRY_BACKOFF_MS[attempt - 1];
            console.log(`[EA API] Tentativa ${attempt + 1}/3 para clubId=${clubId} (aguardando ${waitMs}ms)`);
            await sleep(waitMs);
        }

        try {
            const response = await fetch(url, {
                headers: getEAHeaders(cookies),
                // desabilita cache do Next.js para dados sempre frescos
                next: { revalidate: 0 },
            });

            if (!response.ok) {
                throw new Error(`EA API respondeu ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`[EA API] Sucesso na tentativa ${attempt + 1} para clubId=${clubId}`);
            return data;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            console.error(`[EA API] Tentativa ${attempt + 1} falhou para clubId=${clubId}: ${lastError.message}`);
        }
    }

    throw new Error(
        `[EA API] Todas as 3 tentativas falharam para clubId=${clubId}: ${lastError.message}`
    );
}

/**
 * Buscar partidas recentes de um time.
 * Delega para fetchMatchesRaw mantendo retrocompatibilidade.
 */
export async function fetchClubMatches(
    clubId: string,
    cookie: string,
    _matchType: string = 'gameType13'
): Promise<unknown> {
    return fetchMatchesRaw(clubId, cookie);
}

/** Buscar info de um time pelo ID */
export async function fetchClubInfo(clubId: string, cookie: string): Promise<unknown> {
    const url = `${EA_BASE_URL}/clubs/info?platform=${EA_PLATFORM}&clubIds=${clubId}`;

    const response = await fetch(url, {
        headers: getEAHeaders(cookie),
        next: { revalidate: 0 },
    });

    if (!response.ok) {
        throw new Error(`EA API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

/** Buscar membros de um time */
export async function fetchClubMembers(clubId: string, cookie: string): Promise<unknown> {
    const url = `${EA_BASE_URL}/members/stats?platform=${EA_PLATFORM}&clubId=${clubId}`;

    const response = await fetch(url, {
        headers: getEAHeaders(cookie),
        next: { revalidate: 0 },
    });

    if (!response.ok) {
        throw new Error(`EA API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

/** Buscar times por nome (search) */
export async function searchClubs(searchTerm: string, cookie: string): Promise<unknown> {
    const url = `${EA_BASE_URL}/clubs/search?platform=${EA_PLATFORM}&clubName=${encodeURIComponent(searchTerm)}`;

    const response = await fetch(url, {
        headers: getEAHeaders(cookie),
        next: { revalidate: 0 },
    });

    if (!response.ok) {
        throw new Error(`EA API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}
