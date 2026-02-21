/**
 * EA Sports FC API — Client
 * Integração com a API de Pro Clubs da EA
 *
 * Princípio SSOT: Todas as chamadas à API EA passam por este módulo.
 * Princípio SRP: Este arquivo cuida APENAS de fetch HTTP da API EA.
 */

import type { EaParsedMatch } from '@/types/ea-api';
import { parseMatches } from './parser';
import { upsertDiscoveredClub } from './discovery';
import { createAdminClient } from '@/lib/supabase/admin';

const EA_BASE_URL = process.env.EA_API_BASE_URL || 'https://proclubs.ea.com/api/fc';
const EA_PLATFORM = process.env.EA_PLATFORM || 'common-gen5';

/**
 * Backoff exponencial entre retries: 1s → 2s → 4s.
 * Total: 4 tentativas (1 inicial + 3 retries com backoff).
 */
const RETRY_BACKOFF_MS = [1000, 2000, 4000] as const;

/** Timeout por requisição individual (10 segundos) */
const FETCH_TIMEOUT_MS = 10_000;

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

/** Fetch com AbortController para timeout automático */
function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    return fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(timer));
}

/**
 * Faz GET na API EA para buscar partidas brutas de um time.
 * Retry com backoff exponencial (4 tentativas: imediata → 1s → 2s → 4s).
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

    const maxAttempts = RETRY_BACKOFF_MS.length + 1; // 4 tentativas no total

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (attempt > 0) {
            const waitMs = RETRY_BACKOFF_MS[attempt - 1];
            console.log(`[EA API] Tentativa ${attempt + 1}/${maxAttempts} para clubId=${clubId} (aguardando ${waitMs}ms)`);
            await sleep(waitMs);
        }

        try {
            const response = await fetchWithTimeout(url, {
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
        `[EA API] Todas as ${maxAttempts} tentativas falharam para clubId=${clubId}: ${lastError.message}`
    );
}

/**
 * Busca e parseia partidas de um clube EA.
 * Persiste automaticamente todos os clubes descobertos nas partidas
 * na tabela discovered_clubs para alimentar o Snowball Discovery.
 */
export async function fetchMatches(clubId: string, cookies?: string): Promise<EaParsedMatch[]> {
    const raw = await fetchMatchesRaw(clubId, cookies);
    const matches = parseMatches(raw, clubId);

    // Coleta clubes únicos de todas as partidas para o Discovery Engine
    const uniqueClubs = new Map<string, { clubId: string; name: string }>();
    for (const match of matches) {
        for (const [cId, club] of Object.entries(match.clubs)) {
            if (!uniqueClubs.has(cId)) {
                uniqueClubs.set(cId, { clubId: cId, name: club.nameRaw });
            }
        }
    }

    if (uniqueClubs.size > 0) {
        const adminClient = createAdminClient();
        const results = await Promise.allSettled(
            Array.from(uniqueClubs.values()).map(club =>
                upsertDiscoveredClub(club, adminClient)
            )
        );
        results.forEach(result => {
            if (result.status === 'rejected') {
                console.error(`[EA API] Falha ao persistir clube no Discovery: ${result.reason}`);
            }
        });
    }

    return matches;
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

    const response = await fetchWithTimeout(url, {
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

    const response = await fetchWithTimeout(url, {
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

    const response = await fetchWithTimeout(url, {
        headers: getEAHeaders(cookie),
        next: { revalidate: 0 },
    });

    if (!response.ok) {
        throw new Error(`EA API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}
