import { redirect } from "next/navigation";
import { PositionSettingsForm } from "@/components/player/PositionSettingsForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { PLAYER_POSITIONS } from "@/lib/positions";
import type { PlayerPosition } from "@/types/database";

function isPlayerPosition(value: unknown): value is PlayerPosition {
  return typeof value === "string" && (PLAYER_POSITIONS as readonly string[]).includes(value);
}

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: player, error } = await supabase
    .from("players")
    .select("primary_position, secondary_position")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Configuracao de posicoes</CardTitle>
            <CardDescription>
              Nao foi possivel carregar seus dados de posicao agora.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const initialPrimary = isPlayerPosition(player?.primary_position)
    ? player.primary_position
    : "MC";
  const initialSecondary = isPlayerPosition(player?.secondary_position)
    ? player.secondary_position
    : null;

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Configuracao de posicoes</CardTitle>
          <CardDescription>
            Defina sua posicao primaria e secundaria para melhorar escalacoes e relatorios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PositionSettingsForm
            initialPrimary={initialPrimary}
            initialSecondary={initialSecondary}
          />
        </CardContent>
      </Card>
    </div>
  );
}
