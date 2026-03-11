import Link from "next/link";
import { Sparkles, UserRoundPlus } from "lucide-react";
import { ProfilePanel } from "@/components/profile-shell/ProfilePanel";

export function ProfileEmptyState() {
  return (
    <ProfilePanel className="overflow-hidden p-8 lg:p-10">
      <div className="grid gap-8 lg:grid-cols-[1.35fr_0.85fr] lg:items-center">
        <div className="space-y-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#0d7ff2]/25 bg-[#0d7ff2]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-[#72b7ff]">
            <Sparkles className="h-3.5 w-3.5" />
            Dashboard pessoal indisponivel
          </span>

          <div className="space-y-3">
            <h2 className="max-w-2xl text-3xl font-black tracking-tight text-white">
              Complete seu cadastro de atleta para desbloquear seu perfil competitivo.
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-400">
              Quando voce definir seu jogador e suas posicoes principais, o PIT podera montar seu
              resumo de performance, evolucao de rating, historico de partidas e leitura por
              posicao.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/profile/settings"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0d7ff2] px-5 py-3 text-sm font-bold text-white shadow-[0_0_24px_rgba(13,127,242,0.25)] transition hover:bg-[#2190ff]"
            >
              <UserRoundPlus className="h-4 w-4" />
              Completar cadastro
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/4 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/8"
            >
              Voltar ao dashboard
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          {[
            ["Resumo", "KPIs pessoais, notas e consistencia."],
            ["Evolucao", "Historico real de desempenho por partida."],
            ["Posicoes", "Leitura de impacto em cada funcao do campo."],
          ].map(([title, copy]) => (
            <div key={title} className="rounded-2xl border border-white/6 bg-white/4 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{copy}</p>
            </div>
          ))}
        </div>
      </div>
    </ProfilePanel>
  );
}
