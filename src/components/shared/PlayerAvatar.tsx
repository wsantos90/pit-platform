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
  const normalizedName = name.trim()
  const accessibleName = normalizedName || "Usuário"
  const fallbackInitial = normalizedName.charAt(0).toUpperCase() || "U"

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {src ? (
        <AvatarImage alt={accessibleName} className="object-cover" src={src} />
      ) : null}
      <AvatarFallback
        aria-label={accessibleName}
        className="border border-primary/20 bg-primary/10 font-semibold text-primary"
      >
        {fallbackInitial}
      </AvatarFallback>
    </Avatar>
  )
}
