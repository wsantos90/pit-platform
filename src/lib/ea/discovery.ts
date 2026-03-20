import { normalizeClubName } from './normalize';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { DiscoveredClub } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

export interface EADiscoveredClubInput {
  clubId: string;
  name: string; // Raw name from EA API (potentially Latin-1/ISO-8859-1 encoded as UTF-8)
  regionId?: number;
  teamId?: number;
}

type DiscoveryClient = SupabaseClient;

/**
 * Prepares the club data for insertion into the database by normalizing the name.
 * This function is pure and can be easily tested.
 */
export function prepareDiscoveredClubData(input: EADiscoveredClubInput): Partial<DiscoveredClub> {
  return {
    ea_club_id: input.clubId,
    ea_name_raw: input.name,
    display_name: normalizeClubName(input.name),
    last_scanned_at: new Date().toISOString(),
    // status defaults to 'unclaimed' in DB
  };
}

/**
 * Upserts a discovered club into the database.
 * Handles normalization and data preparation.
 *
 * Usa createAdminClient() como fallback para contornar RLS em contextos
 * sem sessão autenticada (cron jobs, n8n, discovery automático).
 *
 * Race condition corrigida: usa apenas UPSERT atômico + RPC de incremento,
 * sem SELECT prévio que causava inconsistência em execuções paralelas.
 */
export async function upsertDiscoveredClub(
  input: EADiscoveredClubInput,
  supabaseClient?: DiscoveryClient
) {
  // Usa admin client como fallback para garantir que RLS não bloqueie writes
  const supabase = supabaseClient ?? createAdminClient();
  const preparedData = prepareDiscoveredClubData(input);

  const { data, error } = await supabase
    .from('discovered_clubs')
    .upsert(
      { ...preparedData },
      {
        onConflict: 'ea_club_id',
        ignoreDuplicates: false,
      }
    )
    .select()
    .single();

  if (error) {
    logger.error('Error upserting discovered club:', error);
    throw error;
  }

  // Incrementa scan_count atomicamente a cada upsert (insert ou update).
  // Clubs novos: 0 → 1. Re-scans: N → N+1.
  const { error: incrementError } = await supabase.rpc('increment_discovered_club_scan_count', {
    p_ea_club_id: input.clubId,
  });

  if (incrementError) {
    // scan_count é não-crítico — não propaga o erro para não abortar coleta
    logger.error('Error incrementing scan_count:', incrementError);
  }

  return data;
}

/**
 * Searches for discovered clubs by name using fuzzy search.
 * Utilizes the GIN index on display_name for efficient partial matching.
 */
export async function searchDiscoveredClubs(query: string) {
  const normalizedQuery = normalizeClubName(query);
  if (!normalizedQuery.trim()) {
    return [];
  }

  const supabase = await createClient();

  // Using ilike with wildcards allows the GIN index (gin_trgm_ops) to be used for pattern matching
  const { data, error } = await supabase
    .from('discovered_clubs')
    .select('*')
    .ilike('display_name', `%${normalizedQuery}%`)
    .order('display_name', { ascending: true })
    .limit(20);

  if (error) {
    logger.error('Error searching discovered clubs:', error);
    throw error;
  }

  return data;
}

