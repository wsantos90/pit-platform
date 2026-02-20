/**
 * EA Sports FC API — Client
 * Integração com a API de Pro Clubs da EA
 *
 * Princípio SSOT: Todas as chamadas à API EA passam por este módulo.
 * Princípio SRP: Este arquivo cuida APENAS de fetch e parsing da API EA.
 */

const EA_BASE_URL = process.env.EA_API_BASE_URL || 'https://proclubs.ea.com/api/fc';
const EA_PLATFORM = process.env.EA_PLATFORM || 'common-gen5';

/** Headers padrão para a API EA (requer cookie Akamai) */
function getHeaders(cookie: string): HeadersInit {
    return {
        'Content-Type': 'application/json',
        Cookie: cookie,
        'User-Agent': 'Mozilla/5.0',
    };
}

/** Buscar partidas recentes de um time */
export async function fetchClubMatches(
    clubId: string,
    cookie: string,
    matchType: string = 'gameType13'
): Promise<unknown> {
    // TODO: Implementar fetch de partidas da API EA
    const url = `${EA_BASE_URL}/clubs/matches?matchType=${matchType}&platform=${EA_PLATFORM}&clubIds=${clubId}`;

    const response = await fetch(url, {
        headers: getHeaders(cookie),
        next: { revalidate: 0 },
    });

    if (!response.ok) {
        throw new Error(`EA API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

/** Buscar info de um time pelo ID */
export async function fetchClubInfo(clubId: string, cookie: string): Promise<unknown> {
    // TODO: Implementar fetch de info do time
    const url = `${EA_BASE_URL}/clubs/info?platform=${EA_PLATFORM}&clubIds=${clubId}`;

    const response = await fetch(url, {
        headers: getHeaders(cookie),
        next: { revalidate: 0 },
    });

    if (!response.ok) {
        throw new Error(`EA API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

/** Buscar membros de um time */
export async function fetchClubMembers(clubId: string, cookie: string): Promise<unknown> {
    // TODO: Implementar fetch de membros
    const url = `${EA_BASE_URL}/members/stats?platform=${EA_PLATFORM}&clubId=${clubId}`;

    const response = await fetch(url, {
        headers: getHeaders(cookie),
        next: { revalidate: 0 },
    });

    if (!response.ok) {
        throw new Error(`EA API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

/** Buscar times por nome (search) */
export async function searchClubs(searchTerm: string, cookie: string): Promise<unknown> {
    // TODO: Implementar search de times
    const url = `${EA_BASE_URL}/clubs/search?platform=${EA_PLATFORM}&clubName=${encodeURIComponent(searchTerm)}`;

    const response = await fetch(url, {
        headers: getHeaders(cookie),
        next: { revalidate: 0 },
    });

    if (!response.ok) {
        throw new Error(`EA API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}
