'use client'

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Bell } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useNotifications } from "@/hooks/useNotifications"
import { resolveNotificationRoute } from "@/lib/notifications/routes"
import { cn } from "@/lib/utils"
import type { Notification } from "@/types/database"

function getRelativeTime(value: string) {
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true, locale: ptBR })
  } catch {
    return "agora"
  }
}

export function NotificationBell({ userId }: { userId: string }) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, loading, markAsRead } = useNotifications(userId)
  const buttonLabel =
    unreadCount > 0
      ? `Abrir notificacoes, ${unreadCount} nao lida${unreadCount > 1 ? "s" : ""}`
      : "Abrir notificacoes"

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [])

  function handleNotificationClick(notification: Notification) {
    setOpen(false)
    void markAsRead(notification.id)
    router.push(resolveNotificationRoute(notification))
  }

  return (
    <div className="relative" ref={containerRef}>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => setOpen((current) => !current)}
        aria-label={buttonLabel}
        className="relative text-muted-foreground hover:text-foreground"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[22rem] overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Notificacoes</p>
                <p className="text-xs text-muted-foreground">
                  {unreadCount > 0
                    ? `${unreadCount} nao lida${unreadCount > 1 ? "s" : ""}`
                    : "Tudo em dia por aqui"}
                </p>
              </div>
              <Link
                href="/settings/notifications"
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-primary hover:text-primary/80"
              >
                Preferencias
              </Link>
            </div>
          </div>

          <div className="max-h-[24rem] overflow-y-auto">
            {loading ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">
                Carregando notificacoes...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">
                Nenhuma notificacao recente.
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "flex w-full flex-col gap-1 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/40",
                    !notification.is_read && "bg-primary/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">{notification.title}</p>
                    {!notification.is_read ? (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    ) : null}
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {notification.message}
                  </p>
                  <p className="text-[11px] text-muted-foreground/80">
                    {getRelativeTime(notification.created_at)}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
