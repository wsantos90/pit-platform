import { NotificationPreferencesPanel } from "@/components/notifications/NotificationPreferencesPanel"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"

export default async function Page() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userId = user?.id

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Preferencias de notificacoes</CardTitle>
          <CardDescription>
            Ajuste quais alertas aparecem no dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userId ? <NotificationPreferencesPanel userId={userId} /> : null}
        </CardContent>
      </Card>
    </div>
  )
}
