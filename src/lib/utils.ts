/**
 * Utility Helpers
 * Princípio DRY: Funções comuns usadas em todo o projeto.
 */

import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/** Formatar data para exibição BR */
export function formatDate(date: Date | string): string {
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
}

/** Formatar data com hora */
export function formatDateTime(date: Date | string): string {
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

/** Formatar "há X tempo" */
export function timeAgo(date: Date | string): string {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
}

/** Formatar valor em Reais */
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
}

/** Gerar slug a partir de string */
export function slugify(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

/** Delay helper para throttling */
export function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Clampar número entre min e max */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}
