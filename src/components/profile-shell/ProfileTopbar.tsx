"use client";

import { Bell, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { getProfilePageMeta } from "./navigation";

export function ProfileTopbar() {
  const pathname = usePathname();
  const meta = getProfilePageMeta(pathname);

  return (
    <header className="sticky top-0 z-20 border-b border-white/6 bg-[linear-gradient(180deg,rgba(19,29,43,0.96),rgba(13,22,35,0.92))] px-4 py-4 backdrop-blur xl:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{meta.eyebrow}</p>
          <h1 className="truncate text-xl font-bold text-white">{meta.title}</h1>
        </div>

        <div className="flex items-center gap-3">
          <label className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar jogadores..."
              className="h-11 w-72 rounded-xl border border-white/6 bg-white/4 pl-10 pr-4 text-sm text-slate-100 outline-none transition focus:border-[#0d7ff2]/40 focus:bg-white/6"
            />
          </label>

          <button
            type="button"
            className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/6 bg-white/4 text-slate-200 transition hover:bg-white/7"
            aria-label="Notificacoes"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border border-[#101922] bg-red-500" />
          </button>
        </div>
      </div>
    </header>
  );
}
