"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PROFILE_NAV_ITEMS, isProfileNavItemActive } from "./navigation";

export function ProfileMobileNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-white/6 bg-[#0c1624] px-4 py-3 lg:hidden">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PROFILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isProfileNavItemActive(item, pathname);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
                active
                  ? "border-[#0d7ff2]/40 bg-[#0d7ff2]/18 text-[#6cb5ff]"
                  : "border-white/8 bg-white/4 text-slate-300"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
