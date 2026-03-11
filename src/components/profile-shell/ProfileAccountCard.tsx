"use client";

import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

function getInitial(value: string | null | undefined) {
  if (!value) {
    return "P";
  }

  return value.trim().charAt(0).toUpperCase() || "P";
}

export function ProfileAccountCard() {
  const { user, loading, signOut } = useAuth();
  const label = user?.display_name ?? user?.email ?? "Jogador PIT";
  const subtitle = loading ? "Carregando..." : "Sair da conta";

  return (
    <div className="rounded-2xl border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-4 shadow-[0_18px_32px_rgba(0,0,0,0.22)]">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#0d7ff2]/25 bg-[#0d7ff2]/15 text-sm font-bold text-[#79bbff]">
          {getInitial(label)}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{label}</p>
          <p className="truncate text-xs text-slate-500">{subtitle}</p>
        </div>

        <button
          type="button"
          onClick={() => void signOut()}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/6 bg-white/4 text-slate-300 transition hover:border-[#0d7ff2]/30 hover:text-white"
          aria-label="Sair da conta"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
