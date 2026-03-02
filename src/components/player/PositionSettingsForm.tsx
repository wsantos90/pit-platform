"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PositionBadge } from "@/components/player/PositionBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PLAYER_POSITIONS } from "@/lib/positions";
import type { PlayerPosition } from "@/types/database";

const POSITION_LABELS: Record<PlayerPosition, string> = {
  GK: "GK – Goleiro",
  ZAG: "ZAG – Zagueiro",
  VOL: "VOL – Volante",
  MC: "MC – Meia Central",
  AE: "AE – Meia-Esquerda",
  AD: "AD – Meia-Direita",
  ATA: "ATA – Atacante",
};

type PositionSettingsFormProps = {
  initialPrimary: PlayerPosition;
  initialSecondary: PlayerPosition | null;
};

type ToastState = {
  type: "success" | "error";
  message: string;
};

function parseApiError(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "Nao foi possivel salvar as posicoes.";
  }

  const body = payload as { error?: string };
  if (body.error === "same_positions") {
    return "Posicoes primaria e secundaria nao podem ser iguais.";
  }

  if (typeof body.error === "string" && body.error.length > 0) {
    return body.error;
  }

  return "Nao foi possivel salvar as posicoes.";
}

export function PositionSettingsForm({
  initialPrimary,
  initialSecondary,
}: PositionSettingsFormProps) {
  const [primaryPosition, setPrimaryPosition] = useState<PlayerPosition>(initialPrimary);
  const [secondaryPosition, setSecondaryPosition] = useState<PlayerPosition | "">(
    initialSecondary ?? ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 3500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toast]);

  const secondaryEqualsPrimary =
    secondaryPosition !== "" && secondaryPosition === primaryPosition;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedSecondary = secondaryPosition === "" ? null : secondaryPosition;

    if (normalizedSecondary && normalizedSecondary === primaryPosition) {
      setToast({ type: "error", message: "Posicoes primaria e secundaria nao podem ser iguais." });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/player/positions", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          primary_position: primaryPosition,
          secondary_position: normalizedSecondary,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(parseApiError(payload));
      }

      setToast({
        type: "success",
        message: "Posicoes salvas com sucesso.",
      });
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Nao foi possivel salvar as posicoes.";
      setToast({ type: "error", message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
        <div className="space-y-2">
          <Label htmlFor="primary-position">Posicao primaria</Label>
          <Select
            id="primary-position"
            name="primary_position"
            value={primaryPosition}
            onChange={(event) => setPrimaryPosition(event.target.value as PlayerPosition)}
            disabled={isSaving}
          >
            {PLAYER_POSITIONS.map((position) => (
              <option key={position} value={position}>
                {POSITION_LABELS[position]}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="secondary-position">Posicao secundaria</Label>
          <Select
            id="secondary-position"
            name="secondary_position"
            value={secondaryPosition}
            onChange={(event) => setSecondaryPosition(event.target.value as PlayerPosition | "")}
            disabled={isSaving}
          >
            <option value="">Nenhuma</option>
            {PLAYER_POSITIONS.map((position) => (
              <option key={position} value={position}>
                {POSITION_LABELS[position]}
              </option>
            ))}
          </Select>
        </div>

        {secondaryEqualsPrimary ? (
          <p className="text-sm text-destructive">
            Posicoes primaria e secundaria nao podem ser iguais.
          </p>
        ) : null}

        <div className="space-y-2">
          <p className="text-sm font-medium">Previa</p>
          <div className="flex flex-wrap items-center gap-2">
            <PositionBadge position={primaryPosition} />
            {secondaryPosition !== "" ? (
              <PositionBadge position={secondaryPosition} />
            ) : (
              <span className="text-sm text-muted-foreground">Sem posicao secundaria</span>
            )}
          </div>
        </div>

        <Button type="submit" disabled={isSaving || secondaryEqualsPrimary}>
          {isSaving ? "Salvando..." : "Salvar posicoes"}
        </Button>
      </form>

      {toast ? (
        <div
          role="status"
          className={cn(
            "fixed right-6 top-6 z-50 rounded-md border px-4 py-3 text-sm shadow-lg",
            toast.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          )}
        >
          {toast.message}
        </div>
      ) : null}
    </>
  );
}
