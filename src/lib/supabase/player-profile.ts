import { SupabaseClient } from "@supabase/supabase-js";

type EnsurePlayerProfileParams = {
  supabase: SupabaseClient;
  userId: string;
  gamertag: string;
};

export async function ensurePlayerProfile({
  supabase,
  userId,
  gamertag,
}: EnsurePlayerProfileParams) {
  const cleanGamertag = gamertag.trim();
  if (!cleanGamertag) {
    return;
  }

  const { data: existingPlayer } = await supabase
    .from("players")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingPlayer) {
    return;
  }

  await supabase.from("players").insert({
    user_id: userId,
    ea_gamertag: cleanGamertag,
    primary_position: "MC",
  });
}
