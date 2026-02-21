import { normalizeClubName } from './normalize';
import { createClient } from '@/lib/supabase/server';
import { DiscoveredClub } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface EADiscoveredClubInput {
  clubId: string;
  name: string; // Raw name from EA API (potentially Latin-1/ISO-8859-1 encoded as UTF-8)
  regionId?: number;
  teamId?: number;
  // Add other relevant fields from EA API response as needed
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
    // scan_count defaults to 0 in DB, should probably be incremented on update
  };
}

/**
 * Upserts a discovered club into the database.
 * Handles normalization and data preparation.
 */
export async function upsertDiscoveredClub(
  input: EADiscoveredClubInput,
  supabaseClient?: DiscoveryClient
) {
  const supabase = supabaseClient ?? await createClient();
  const preparedData = prepareDiscoveredClubData(input);
  const { data: existingClub } = await supabase
    .from('discovered_clubs')
    .select('id')
    .eq('ea_club_id', input.clubId)
    .maybeSingle();

  const { data, error } = await supabase
    .from('discovered_clubs')
    .upsert(
      {
        ...preparedData,
      },
      {
        onConflict: 'ea_club_id',
        ignoreDuplicates: false,
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting discovered club:', error);
    throw error;
  }

  // On re-scan, increment scan_count atomically at database level.
  if (existingClub) {
    const { error: incrementError } = await supabase.rpc('increment_discovered_club_scan_count', {
      p_ea_club_id: input.clubId,
    });

    if (incrementError) {
      console.error('Error incrementing scan_count:', incrementError);
      throw incrementError;
    }
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
    console.error('Error searching discovered clubs:', error);
    throw error;
  }

  return data;
}
