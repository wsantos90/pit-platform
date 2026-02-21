import { describe, expect, it } from 'vitest';
import { normalizeClubName } from '@/lib/ea/normalize';

describe('normalizeClubName', () => {
    describe('Double Encoding (Casos Críticos do PRD)', () => {
        it('deve normalizar "CÃƒÂ¡ssia" para "Cássia"', () => {
            expect(normalizeClubName('CÃƒÂ¡ssia')).toBe('Cássia');
        });

        it('deve normalizar "AthÃƒÂ©tica" para "Athética"', () => {
            expect(normalizeClubName('AthÃƒÂ©tica')).toBe('Athética');
        });

        it('deve normalizar "SÃƒÂ£o Paulo" para "São Paulo"', () => {
            expect(normalizeClubName('SÃƒÂ£o Paulo')).toBe('São Paulo');
        });
    });

    describe('Single Encoding (Casos Simples)', () => {
        it('deve normalizar "SÃ£o Paulo" para "São Paulo"', () => {
            expect(normalizeClubName('SÃ£o Paulo')).toBe('São Paulo');
        });

        it('deve normalizar "VitÃ³ria" para "Vitória"', () => {
            expect(normalizeClubName('VitÃ³ria')).toBe('Vitória');
        });

        it('deve normalizar "GrÃªmio" para "Grêmio"', () => {
            expect(normalizeClubName('GrÃªmio')).toBe('Grêmio');
        });
    });

    describe('Limpeza e Sanitização', () => {
        it('deve remover espaços extras no início e fim', () => {
            expect(normalizeClubName('  Santos FC  ')).toBe('Santos FC');
        });

        it('deve reduzir múltiplos espaços internos para um único', () => {
            expect(normalizeClubName('Real   Madrid')).toBe('Real Madrid');
        });

        it('deve remover caracteres de controle invisíveis', () => {
            // \x00 é null byte
            expect(normalizeClubName('Test\x00Club')).toBe('TestClub');
        });
    });

    describe('Idempotência e Casos Normais', () => {
        it('não deve alterar nomes que já estão corretos', () => {
            expect(normalizeClubName('Flamengo')).toBe('Flamengo');
        });

        it('não deve alterar nomes com acentos corretos', () => {
            expect(normalizeClubName('São Paulo')).toBe('São Paulo');
        });

        it('deve retornar string vazia se input for vazio', () => {
            expect(normalizeClubName('')).toBe('');
        });
    });
});
