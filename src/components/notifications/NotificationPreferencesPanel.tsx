'use client'

import { useNotificationPrefs } from "@/hooks/useNotificationPrefs"
import { cn } from "@/lib/utils"

export function NotificationPreferencesPanel({ userId }: { userId: string }) {
  const { items, loading, savingType, errorMessage, setInAppEnabled } = useNotificationPrefs(userId)

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando preferencias...</p>
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Controle quais avisos aparecem no sino de notificacoes do dashboard.
        </p>
        <p className="text-xs text-muted-foreground">
          Email continua em fase futura. Aqui voce liga ou desliga apenas notificacoes in-app.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      <div className="space-y-3">
        {items.map((item) => {
          const isSaving = savingType === item.type

          return (
            <div
              key={item.type}
              className="flex flex-col gap-4 rounded-2xl border border-border bg-muted/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {item.inappEnabled ? "Ativado" : "Desativado"}
                </span>

                <button
                  type="button"
                  role="switch"
                  aria-checked={item.inappEnabled}
                  aria-label={`Alternar ${item.label}`}
                  disabled={isSaving}
                  onClick={() => void setInAppEnabled(item.type, !item.inappEnabled)}
                  className={cn(
                    "relative inline-flex h-7 w-12 items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                    item.inappEnabled
                      ? "border-primary/40 bg-primary/80"
                      : "border-border bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-5 w-5 rounded-full bg-white transition-transform",
                      item.inappEnabled ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
