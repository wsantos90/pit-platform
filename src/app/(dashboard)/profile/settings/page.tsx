import { redirect } from "next/navigation";
import { PlayerIdentityForm } from "@/components/player/PlayerIdentityForm";
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
    .select("ea_gamertag, primary_position, secondary_position")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Configuracoes do jogador</CardTitle>
            <CardDescription>
              Nao foi possivel carregar seus dados de jogador agora.
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
  const initialGamertag = typeof player?.ea_gamertag === "string" ? player.ea_gamertag : "";
  const hasPlayerProfile = initialGamertag.trim().length >= 3;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Identificacao do jogador</CardTitle>
          <CardDescription>
            Informe sua EA Gamertag para conectar seu atleta ao elenco, convites e estatisticas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlayerIdentityForm initialGamertag={initialGamertag} />
        </CardContent>
      </Card>

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
            disabledReason={
              hasPlayerProfile
                ? null
                : "Salve primeiro sua EA Gamertag para criar o perfil de jogador."
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
