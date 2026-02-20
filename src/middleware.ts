import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Middleware Next.js — Refresh de sessão Supabase
 * Roda em todas as rotas exceto assets estáticos
 */
export async function middleware(request: NextRequest) {
    return await updateSession(request);
}

export const config = {
    matcher: [
        /*
         * Match todas as rotas exceto:
         * - _next/static (arquivos estáticos)
         * - _next/image (otimização de imagem)
         * - favicon.ico (ícone do site)
         * - Arquivos de imagem (svg, png, jpg, etc.)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
