/**
 * Matchmaking — lógica de matching extraída para ser reutilizada
 * pelo cron (/api/matchmaking/match) e pelo queue POST (/api/matchmaking/queue).
 */

import { createAdminClient } from '@/lib/supabase/admin';

const DEFAULT_RATING = 1000;

type QueueEntry = {
  id: string;
  club_id: string;
  slot_time: string;
  status: string;
  pit_rating: number;
};

/**
 * Executa o matching para todos os slots com 2+ entries em 'waiting',
 * ou somente para um slot específico se `slotTime` for fornecido.
 *
 * Parea clubs por proximidade de pit_rating (sort + adjacent pairing).
 * Fallback: DEFAULT_RATING quando o clube não tem rating.
 *
 * Retorna o número de pares criados.
 */
export async function runMatching(slotTime?: string): Promise<number> {
  const adminClient = createAdminClient();

  let query = adminClient
    .from('matchmaking_queue')
    .select('id, club_id, slot_time, status, clubs(pit_rating)')
    .eq('status', 'waiting')
    .order('created_at', { ascending: true });

  if (slotTime) {
    query = query.eq('slot_time', slotTime);
  }

  const { data: waitingEntries, error: fetchError } = await query;

  if (fetchError) {
    console.error('[runMatching] fetch error:', fetchError);
    return 0;
  }

  if (!waitingEntries || waitingEntries.length < 2) {
    return 0;
  }

  // Group by slot_time
  const bySlot = new Map<string, QueueEntry[]>();
  for (const entry of waitingEntries) {
    const clubRating = (entry.clubs as { pit_rating: number | null } | null)?.pit_rating;
    const e: QueueEntry = {
      id: entry.id,
      club_id: entry.club_id,
      slot_time: entry.slot_time,
      status: entry.status,
      pit_rating: clubRating ?? DEFAULT_RATING,
    };
    const existing = bySlot.get(entry.slot_time) ?? [];
    existing.push(e);
    bySlot.set(entry.slot_time, existing);
  }

  let matched = 0;

  for (const [, entries] of bySlot) {
    if (entries.length < 2) continue;

    // Sort by pit_rating ascending, then pair adjacent entries.
    // Adjacent pairs minimise |ratingA - ratingB| across all possible pairings.
    entries.sort((a, b) => a.pit_rating - b.pit_rating);

    for (let i = 0; i + 1 < entries.length; i += 2) {
      const entryA = entries[i];
      const entryB = entries[i + 1];

      const { error: updateA } = await adminClient
        .from('matchmaking_queue')
        .update({ status: 'matched', matched_with: entryB.id })
        .eq('id', entryA.id)
        .eq('status', 'waiting');

      if (updateA) {
        console.error('[runMatching] failed to update entry A:', updateA);
        continue;
      }

      const { error: updateB } = await adminClient
        .from('matchmaking_queue')
        .update({ status: 'matched', matched_with: entryA.id })
        .eq('id', entryB.id)
        .eq('status', 'waiting');

      if (updateB) {
        // Rollback A
        await adminClient
          .from('matchmaking_queue')
          .update({ status: 'waiting', matched_with: null })
          .eq('id', entryA.id);
        console.error('[runMatching] failed to update entry B, rolled back A:', updateB);
        continue;
      }

      // Create confrontation chat (24h expiry)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { error: chatError } = await adminClient
        .from('confrontation_chats')
        .insert({
          queue_entry_a: entryA.id,
          queue_entry_b: entryB.id,
          club_a_id: entryA.club_id,
          club_b_id: entryB.club_id,
          status: 'active',
          expires_at: expiresAt,
        });

      if (chatError) {
        console.error('[runMatching] failed to create chat, rolling back:', chatError);
        await adminClient
          .from('matchmaking_queue')
          .update({ status: 'waiting', matched_with: null })
          .in('id', [entryA.id, entryB.id]);
        continue;
      }

      matched += 1;
    }
  }

  return matched;
}
