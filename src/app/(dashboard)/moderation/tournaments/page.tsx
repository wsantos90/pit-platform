import { redirect } from "next/navigation"

export default function ModerationTournamentsAliasPage() {
  redirect("/moderation?tab=tournaments")
}
