/**
 * Normalização de Encoding — Pipeline Latin-1 → UTF-8
 *
 * A API EA retorna nomes de times com encoding corrompido (Latin-1 em campo UTF-8).
 * Este módulo implementa o pipeline de normalização descrito no FC12.
 *
 * Princípio SRP: Apenas normalização de strings.
 * Princípio DRY: Centraliza toda lógica de encoding.
 */

/** Mapa de substituições de duplo encoding (comuns na API EA Pro Clubs) */
const DOUBLE_ENCODING_MAP: Record<string, string> = {
    // Casos de duplo encoding (UTF-8 interpretado como Latin-1 duas vezes)
    'ÃƒÂ¡': 'á', 'ÃƒÂ ': 'à', 'ÃƒÂ¢': 'â', 'ÃƒÂ£': 'ã', 'ÃƒÂ¤': 'ä',
    'ÃƒÂ©': 'é', 'ÃƒÂ¨': 'è', 'ÃƒÂª': 'ê', 'ÃƒÂ«': 'ë',
    'ÃƒÂ­': 'í', 'ÃƒÂ¬': 'ì', 'ÃƒÂ®': 'î', 'ÃƒÂ¯': 'ï',
    'ÃƒÂ³': 'ó', 'ÃƒÂ²': 'ò', 'ÃƒÂ´': 'ô', 'ÃƒÂµ': 'õ', 'ÃƒÂ¶': 'ö',
    'ÃƒÂº': 'ú', 'ÃƒÂ¹': 'ù', 'ÃƒÂ»': 'û', 'ÃƒÂ¼': 'ü',
    'ÃƒÂ§': 'ç', 'ÃƒÂ±': 'ñ',
    // Maiúsculas
    'ÃƒÂ': 'Á', 'Ãƒâ€': 'À', 'Ãƒâ€°': 'É', 'Ãƒâ€"': 'Ó',
};

/** Mapa de substituições comuns de encoding corrompido (simples) */
const ENCODING_MAP: Record<string, string> = {
    'Ã¡': 'á', 'Ã ': 'à', 'Ã¢': 'â', 'Ã£': 'ã', 'Ã¤': 'ä',
    'Ã©': 'é', 'Ã¨': 'è', 'Ãª': 'ê', 'Ã«': 'ë',
    'Ã­': 'í', 'Ã¬': 'ì', 'Ã®': 'î', 'Ã¯': 'ï',
    'Ã³': 'ó', 'Ã²': 'ò', 'Ã´': 'ô', 'Ãµ': 'õ', 'Ã¶': 'ö',
    'Ãº': 'ú', 'Ã¹': 'ù', 'Ã»': 'û', 'Ã¼': 'ü',
    'Ã§': 'ç', 'Ã±': 'ñ',
    'Ã': 'Á', 'Ã‰': 'É', 'Ã"': 'Ó',
};

/**
 * Normaliza o nome de um clube, corrigindo artefatos de encoding da API EA.
 * Trata casos de duplo e triplo encoding comuns na API do Pro Clubs.
 *
 * Pipeline: raw → Double Encoding Fix → Latin-1 decode → Unicode Normalize → Clean
 *
 * @param rawName - O nome original recebido da API (ex: "CÃƒÂ¡ssia")
 * @returns O nome normalizado e limpo (ex: "Cássia")
 */
export function normalizeClubName(rawName: string): string {
    if (!rawName) return rawName;

    let result = rawName;

    // Fase 1: Correção de Duplo Encoding (Prioritário)
    // Ex: "CÃƒÂ¡ssia" -> "Cássia"
    for (const [broken, fixed] of Object.entries(DOUBLE_ENCODING_MAP)) {
        result = result.replaceAll(broken, fixed);
    }

    // Fase 2: Substituição de padrões conhecidos (Encoding Simples)
    // Ex: "Ã¡" -> "á" (se restou algum ou se era apenas encoding simples)
    for (const [broken, fixed] of Object.entries(ENCODING_MAP)) {
        result = result.replaceAll(broken, fixed);
    }

    // Fase 3: Normalização Unicode (NFC — Canonical Decomposition + Composition)
    result = result.normalize('NFC');

    // Fase 4: Limpeza de caracteres de controle
    result = result.replace(/[\x00-\x1F\x7F]/g, '');

    // Fase 5: Trim de espaços extras
    result = result.replace(/\s+/g, ' ').trim();

    return result;
}

/**
 * Alias mantido para compatibilidade, agora usando a nova implementação robusta.
 * @deprecated Use normalizeClubName
 */
export function normalizeEaString(raw: string): string {
    return normalizeClubName(raw);
}

/**
 * Gera um display_name limpo para exibição
 */
export function toDisplayName(rawName: string): string {
    return normalizeClubName(rawName);
}
