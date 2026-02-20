import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase ADMIN (service_role)
 * NUNCA usar no client-side — bypassa RLS
 * Usar apenas em API Routes para operações administrativas
 */
export function createAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}
