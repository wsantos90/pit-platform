import { redirect } from "next/navigation"

export default function ModerationUsersAliasPage() {
  redirect("/moderation?tab=users")
}
