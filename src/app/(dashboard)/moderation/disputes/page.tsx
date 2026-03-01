import { redirect } from "next/navigation"

export default function ModerationDisputesAliasPage() {
  redirect("/moderation?tab=disputes")
}
