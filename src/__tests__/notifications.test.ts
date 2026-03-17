import { describe, expect, it, vi } from "vitest"
import {
  applyNotificationInsert,
  applyNotificationUpdate,
  markNotificationAsReadLocally,
  rollbackNotificationRead,
  sortNotifications,
} from "@/hooks/useNotifications"
import { createNotification } from "@/lib/notifications"
import { resolveNotificationRoute } from "@/lib/notifications/routes"
import type { Notification, NotificationType } from "@/types/database"

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "notification-1",
    user_id: "user-1",
    type: "general",
    title: "Titulo",
    message: "Mensagem",
    data: null,
    is_read: false,
    created_at: "2026-03-17T12:00:00.000Z",
    ...overrides,
  }
}

function makeAdminClient(options?: {
  preference?: { inapp_enabled?: boolean } | null
  insertError?: { message: string } | null
  notification?: Notification
}) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: options?.preference ?? null,
    error: null,
  })
  const single = vi.fn().mockResolvedValue({
    data: options?.insertError ? null : options?.notification ?? makeNotification(),
    error: options?.insertError ?? null,
  })
  const notificationsSelect = vi.fn().mockReturnValue({ single })
  const notificationsInsert = vi.fn().mockReturnValue({ select: notificationsSelect })
  const from = vi.fn((table: string) => {
    if (table === "user_notification_prefs") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle,
            }),
          }),
        }),
      }
    }

    if (table === "notifications") {
      return {
        insert: notificationsInsert,
      }
    }

    return {}
  })

  return {
    from,
    __mocks: {
      maybeSingle,
      notificationsInsert,
      notificationsSelect,
      single,
    },
  }
}

describe("notifications helpers", () => {
  it("createNotification respeita preferencia in-app desativada", async () => {
    const adminClient = makeAdminClient({ preference: { inapp_enabled: false } })

    const result = await createNotification(
      {
        userId: "user-1",
        type: "general",
        title: "Teste",
        message: "Nao deve criar",
      },
      adminClient as never
    )

    expect(result.skipped).toBe(true)
    expect(result.error).toBeNull()
    expect(adminClient.__mocks.notificationsInsert).not.toHaveBeenCalled()
  })

  it("createNotification retorna a notificacao criada quando persiste com sucesso", async () => {
    const createdNotification = makeNotification({
      id: "notification-2",
      type: "claim_approved",
      title: "Claim aprovada",
    })
    const adminClient = makeAdminClient({ notification: createdNotification })

    const result = await createNotification(
      {
        userId: "user-1",
        type: "claim_approved",
        title: "Claim aprovada",
        message: "Sua claim foi aprovada.",
      },
      adminClient as never
    )

    expect(result.skipped).toBe(false)
    expect(result.error).toBeNull()
    expect(result.data).toEqual(createdNotification)
  })

  it("createNotification consulta a preferencia atual a cada chamada", async () => {
    const adminClient = makeAdminClient()
    adminClient.__mocks.maybeSingle
      .mockResolvedValueOnce({ data: { inapp_enabled: false }, error: null })
      .mockResolvedValueOnce({ data: { inapp_enabled: true }, error: null })

    const firstResult = await createNotification(
      {
        userId: "user-1",
        type: "general",
        title: "Primeira tentativa",
        message: "Nao deve criar",
      },
      adminClient as never
    )
    const secondResult = await createNotification(
      {
        userId: "user-1",
        type: "general",
        title: "Segunda tentativa",
        message: "Agora deve criar",
      },
      adminClient as never
    )

    expect(firstResult.skipped).toBe(true)
    expect(secondResult.skipped).toBe(false)
    expect(adminClient.__mocks.notificationsInsert).toHaveBeenCalledTimes(1)
  })

  it("evita decrementar unreadCount duas vezes no echo do realtime apos markAsRead", () => {
    const original = makeNotification()
    const snapshot = {
      notifications: [original],
      unreadCount: 3,
    }

    const optimistic = markNotificationAsReadLocally(snapshot, original.id)
    const echoed = applyNotificationUpdate(
      optimistic,
      { ...original, is_read: true },
      { is_read: false },
      10
    )

    expect(optimistic.unreadCount).toBe(2)
    expect(echoed.unreadCount).toBe(2)
    expect(echoed.notifications[0].is_read).toBe(true)
  })

  it("rollbackNotificationRead restaura o contador e o estado original", () => {
    const original = makeNotification()
    const snapshot = {
      notifications: [original],
      unreadCount: 1,
    }

    const optimistic = markNotificationAsReadLocally(snapshot, original.id)
    const restored = rollbackNotificationRead(optimistic, original)

    expect(restored.unreadCount).toBe(1)
    expect(restored.notifications[0]).toEqual(original)
  })

  it("applyNotificationInsert mantem ordem decrescente por created_at", () => {
    const older = makeNotification({
      id: "notification-older",
      created_at: "2026-03-16T12:00:00.000Z",
      is_read: true,
    })
    const newer = makeNotification({
      id: "notification-newer",
      created_at: "2026-03-17T18:00:00.000Z",
    })

    const inserted = applyNotificationInsert(
      {
        notifications: sortNotifications([older]),
        unreadCount: 0,
      },
      newer,
      10
    )

    expect(inserted.notifications.map((notification) => notification.id)).toEqual([
      "notification-newer",
      "notification-older",
    ])
    expect(inserted.unreadCount).toBe(1)
  })

  it("resolveNotificationRoute usa dados contextuais quando disponiveis", () => {
    const tournamentNotification = makeNotification({
      type: "tournament_confirmed" as NotificationType,
      data: { tournament_id: "tournament-1" },
    })
    const paymentNotification = makeNotification({
      type: "payment_due" as NotificationType,
      data: { tournament_id: "tournament-2" },
    })
    const rosterInviteNotification = makeNotification({
      type: "roster_invite" as NotificationType,
    })
    const generalNotification = makeNotification()

    expect(resolveNotificationRoute(tournamentNotification)).toBe("/tournaments/tournament-1")
    expect(resolveNotificationRoute(paymentNotification)).toBe("/tournaments/tournament-2")
    expect(resolveNotificationRoute(rosterInviteNotification)).toBe("/team/roster")
    expect(resolveNotificationRoute(generalNotification)).toBe("/dashboard")
  })
})
