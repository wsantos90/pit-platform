import * as React from "react";
import { cn } from "@/lib/utils";

type ProfilePanelProps = React.HTMLAttributes<HTMLDivElement>;

export function ProfilePanel({ className, ...props }: ProfilePanelProps) {
  return (
    <div
      className={cn(
        "rounded-[22px] border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.015))] bg-[#0f1a29] shadow-[0_18px_38px_rgba(0,0,0,0.24)]",
        className
      )}
      {...props}
    />
  );
}
