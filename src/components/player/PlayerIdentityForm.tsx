"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type PlayerIdentityFormProps = {
  initialGamertag: string;
};

type ToastState = {
  type: "success" | "error";
  message: string;
};

function parseApiError(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "Nao foi possivel salvar sua EA Gamertag.";
  }

  const body = payload as { error?: string };

  if (body.error === "gamertag_already_in_use") {
    return "Esta EA Gamertag ja esta sendo usada por outro jogador.";
  }

  if (typeof body.error === "string" && body.error.length > 0) {
    return body.error;
  }

  return "Nao foi possivel salvar sua EA Gamertag.";
}

export function PlayerIdentityForm({ initialGamertag }: PlayerIdentityFormProps) {
  const router = useRouter();
  const [gamertag, setGamertag] = useState(initialGamertag);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanGamertag = gamertag.trim();
    if (cleanGamertag.length < 3) {
      setToast({
        type: "error",
        message: "A EA Gamertag deve ter ao menos 3 caracteres.",
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/player/profile", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ea_gamertag: cleanGamertag,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(parseApiError(payload));
      }

      setGamertag(payload?.ea_gamertag ?? cleanGamertag);
      setToast({
        type: "success",
        message: "EA Gamertag salva com sucesso.",
      });
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Nao foi possivel salvar sua EA Gamertag.";
      setToast({ type: "error", message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
        <div className="space-y-2">
          <Label htmlFor="ea-gamertag">EA Gamertag (ID)</Label>
          <Input
            id="ea-gamertag"
            name="ea_gamertag"
            value={gamertag}
            onChange={(event) => setGamertag(event.target.value)}
            placeholder="Seu EA ID"
            autoComplete="nickname"
            disabled={isSaving}
          />
          <p className="text-sm text-muted-foreground">
            Este identificador conecta seu perfil de atleta com convites, elenco e estatisticas.
          </p>
        </div>

        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Salvando..." : "Salvar EA Gamertag"}
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
