"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PROFILE_NAV_ITEMS, isProfileNavItemActive } from "./navigation";

export function ProfileSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0d7ff2] shadow-[0_0_18px_rgba(13,127,242,0.35)]">
          <span className="text-base font-black text-white">P</span>
        </div>
        <div>
          <p className="text-lg font-extrabold tracking-tight text-white">P.I.T</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Intelligence Tracking
          </p>
        </div>
      </div>

      <nav className="space-y-1">
        {PROFILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isProfileNavItemActive(item, pathname);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                active
                  ? "bg-[#0d7ff2]/18 text-[#52a6ff] shadow-[inset_0_0_0_1px_rgba(13,127,242,0.12)]"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
