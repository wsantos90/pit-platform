import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const bodySchema = z.object({
  chat_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { chat_id } = parsed.data;

    // Get user's club
    const { data: club, error: clubError } = await supabase
      .from('clubs')
      .select('id')
      .eq('manager_id', user.id)
      .single();

    if (clubError || !club) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    // Fetch chat
    const { data: chat, error: chatError } = await supabase
      .from('confrontation_chats')
      .select('*')
      .eq('id', chat_id)
      .single();

    if (chatError || !chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    if (chat.status !== 'active') {
      return NextResponse.json({ error: 'Chat is not active' }, { status: 409 });
    }

    const isClubA = chat.club_a_id === club.id;
    const isClubB = chat.club_b_id === club.id;

    if (!isClubA && !isClubB) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminClient = createAdminClient();

    const updatePayload: Record<string, unknown> = {};
    if (isClubA) {
      updatePayload.confirmed_by_a = true;
    } else {
      updatePayload.confirmed_by_b = true;
    }

    const newConfirmedA = isClubA ? true : chat.confirmed_by_a;
    const newConfirmedB = isClubB ? true : chat.confirmed_by_b;

    if (newConfirmedA && newConfirmedB) {
      updatePayload.status = 'confirmed';
    }

    const { data: updatedChat, error: updateError } = await adminClient
      .from('confrontation_chats')
      .update(updatePayload)
      .eq('id', chat_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ chat: updatedChat });
  } catch (err) {
    logger.error('[Matchmaking/Confirm]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

