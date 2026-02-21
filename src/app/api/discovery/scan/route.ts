import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { upsertDiscoveredClub } from '@/lib/ea/discovery';

const discoveredClubSchema = z.object({
  clubId: z.string().trim().min(1, 'clubId is required'),
  name: z.string().trim().min(1, 'name is required'),
  regionId: z.number().int().optional(),
  teamId: z.number().int().optional(),
});

const scanPayloadSchema = z.object({
  clubs: z.array(discoveredClubSchema).min(1, 'clubs must contain at least one item'),
});

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const parsedPayload = scanPayloadSchema.safeParse(payload);

  if (!parsedPayload.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsedPayload.error.flatten() },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();
  const failures: Array<{ clubId: string; reason: string }> = [];
  let insertedOrUpdated = 0;

  for (const club of parsedPayload.data.clubs) {
    try {
      await upsertDiscoveredClub(club, adminClient);
      insertedOrUpdated += 1;
    } catch (error) {
      failures.push({
        clubId: club.clubId,
        reason: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({
    processed: parsedPayload.data.clubs.length,
    inserted_or_updated: insertedOrUpdated,
    failed: failures.length,
    failures,
  });
}
