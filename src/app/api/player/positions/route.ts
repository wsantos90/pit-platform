import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { PLAYER_POSITIONS } from "@/lib/positions";

const updatePositionsSchema = z.object({
  primary_position: z.enum(PLAYER_POSITIONS),
  secondary_position: z.enum(PLAYER_POSITIONS).nullable(),
});

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsedPayload = updatePositionsSchema.safeParse(payload);

  if (!parsedPayload.success) {
    return NextResponse.json(
      {
        error: "invalid_payload",
        details: parsedPayload.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { primary_position, secondary_position } = parsedPayload.data;

  if (secondary_position && primary_position === secondary_position) {
    return NextResponse.json({ error: "same_positions" }, { status: 400 });
  }

  const { data: updatedPlayer, error: updateError } = await supabase
    .from("players")
    .update({
      primary_position,
      secondary_position,
    })
    .eq("user_id", user.id)
    .select("primary_position, secondary_position")
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: "failed_to_update_player_positions" }, { status: 500 });
  }

  if (!updatedPlayer) {
    return NextResponse.json({ error: "player_not_found" }, { status: 404 });
  }

  return NextResponse.json({
    primary_position: updatedPlayer.primary_position,
    secondary_position: updatedPlayer.secondary_position,
  });
}
