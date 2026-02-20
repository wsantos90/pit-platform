/**
 * EA API Response Parser
 *
 * Transforma respostas brutas da API EA em objetos tipados
 * usados pela aplicação.
 *
 * Princípio SRP: Apenas parsing/transformação de dados.
 * Princípio DRY: Um único lugar para transformar dados EA.
 */

import { normalizeEaString } from './normalize';

// TODO: Implementar parsers específicos para cada endpoint da EA API

/** Parsear resposta de partida da EA API */
export function parseMatchResponse(raw: unknown): unknown {
    // TODO: Implementar parsing de match
    return raw;
}

/** Parsear resposta de info do time */
export function parseClubInfoResponse(raw: unknown): unknown {
    // TODO: Implementar parsing de club info
    return raw;
}

/** Parsear resposta de membros do time */
export function parseMembersResponse(raw: unknown): unknown {
    // TODO: Implementar parsing de members
    return raw;
}

/** Normalizar nome de time vindo da API */
export function normalizeClubName(rawName: string): string {
    return normalizeEaString(rawName);
}
