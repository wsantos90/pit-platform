type IconProps = {
  name: string
  className?: string
  filled?: boolean
  size?: "xs" | "sm" | "md" | "lg" | "xl"
}

const sizeMap: Record<NonNullable<IconProps["size"]>, string> = {
  xs: "text-base",
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-3xl",
}

export function Icon({ name, className = "", filled = false, size = "md" }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined select-none leading-none ${sizeMap[size]} ${className}`}
      style={{ fontVariationSettings: `'FILL' ${filled ? 1 : 0}` }}
    >
      {name}
    </span>
  )
}
