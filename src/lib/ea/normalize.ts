/**
 * Normalização de Encoding — Pipeline Latin-1 → UTF-8
 *
 * A API EA retorna nomes de times com encoding corrompido (Latin-1 em campo UTF-8).
 * Este módulo implementa o pipeline de normalização descrito no FC12.
 *
 * Princípio SRP: Apenas normalização de strings.
 * Princípio DRY: Centraliza toda lógica de encoding.
 */

/** Mapa de substituições comuns de encoding corrompido */
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
 * Normaliza uma string potencialmente corrompida da API EA
 * Pipeline: raw → Latin-1 decode → UTF-8 encode → clean
 */
export function normalizeEaString(raw: string): string {
    if (!raw) return raw;

    let result = raw;

    // Fase 1: Substituição de padrões conhecidos
    for (const [broken, fixed] of Object.entries(ENCODING_MAP)) {
        result = result.replaceAll(broken, fixed);
    }

    // Fase 2: Normalização Unicode (NFC — Canonical Decomposition + Composition)
    result = result.normalize('NFC');

    // Fase 3: Limpeza de caracteres de controle
    result = result.replace(/[\x00-\x1F\x7F]/g, '');

    // Fase 4: Trim de espaços extras
    result = result.replace(/\s+/g, ' ').trim();

    return result;
}

/**
 * Gera um display_name limpo para exibição
 */
export function toDisplayName(rawName: string): string {
    return normalizeEaString(rawName);
}
