import { redirect } from "next/navigation"

export default function ModerationClaimsAliasPage() {
  redirect("/moderation?tab=claims")
}
