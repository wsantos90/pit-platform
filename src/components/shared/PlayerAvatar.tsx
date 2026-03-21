import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export type PlayerAvatarProps = {
  src?: string | null
  name: string
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeClasses = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-16 text-2xl",
}

export function PlayerAvatar({
  src,
  name,
  size = "md",
  className,
}: PlayerAvatarProps) {
  const fallbackInitial = name.trim().charAt(0).toUpperCase() || "?"

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {src ? <AvatarImage alt={name} className="object-cover" src={src} /> : null}
      <AvatarFallback
        aria-label={name}
        className="border border-primary/20 bg-primary/10 font-semibold text-primary"
      >
        {fallbackInitial}
      </AvatarFallback>
    </Avatar>
  )
}
