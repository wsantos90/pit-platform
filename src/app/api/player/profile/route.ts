import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const updatePlayerProfileSchema = z.object({
  ea_gamertag: z
    .string()
    .trim()
    .min(3, "EA Gamertag deve ter ao menos 3 caracteres.")
    .max(32, "EA Gamertag deve ter no maximo 32 caracteres."),
});

function isUniqueViolation(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === "23505" || error.message?.toLowerCase().includes("duplicate key") === true;
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsedPayload = updatePlayerProfileSchema.safeParse(payload);

  if (!parsedPayload.success) {
    return NextResponse.json(
      {
        error: "invalid_payload",
        details: parsedPayload.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { ea_gamertag } = parsedPayload.data;

  const { data: existingPlayer, error: lookupError } = await supabase
    .from("players")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ error: "failed_to_load_player_profile" }, { status: 500 });
  }

  let updatedPlayer:
    | { id: string; ea_gamertag: string; primary_position: string; secondary_position: string | null }
    | null
    | undefined;
  let writeError: { code?: string; message?: string } | null = null;

  if (existingPlayer) {
    const { data, error } = await supabase
      .from("players")
      .update({ ea_gamertag })
      .eq("user_id", user.id)
      .select("id, ea_gamertag, primary_position, secondary_position")
      .maybeSingle();

    updatedPlayer = data;
    writeError = error;
  } else {
    const { data, error } = await supabase
      .from("players")
      .insert({
        user_id: user.id,
        ea_gamertag,
        primary_position: "MC",
      })
      .select("id, ea_gamertag, primary_position, secondary_position")
      .single();

    updatedPlayer = data;
    writeError = error;
  }

  if (isUniqueViolation(writeError)) {
    return NextResponse.json({ error: "gamertag_already_in_use" }, { status: 409 });
  }

  if (writeError) {
    return NextResponse.json({ error: "failed_to_save_player_profile" }, { status: 500 });
  }

  await Promise.allSettled([
    supabase.from("users").update({ display_name: ea_gamertag }).eq("id", user.id),
    supabase.auth.updateUser({
      data: {
        display_name: ea_gamertag,
        ea_gamertag,
      },
    }),
  ]);

  return NextResponse.json({
    id: updatedPlayer?.id ?? null,
    ea_gamertag: updatedPlayer?.ea_gamertag ?? ea_gamertag,
    primary_position: updatedPlayer?.primary_position ?? "MC",
    secondary_position: updatedPlayer?.secondary_position ?? null,
  });
}
