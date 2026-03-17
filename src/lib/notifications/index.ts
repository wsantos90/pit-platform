import { createAdminClient } from "@/lib/supabase/admin"
import type { Notification, NotificationType } from "@/types/database"

type NotificationData = Record<string, unknown> | null

type CreateNotificationInput = {
  userId: string
  type: NotificationType
  title: string
  message: string
  data?: NotificationData
}

type AdminClient = ReturnType<typeof createAdminClient>

type CreateNotificationResult = {
  data: Notification | null
  error: Error | null
  skipped: boolean
}

type MarkNotificationAsReadInput = {
  userId: string
  type?: NotificationType
  dataFilter?: Record<string, unknown>
}

let sharedAdminClient: AdminClient | null = null

function getAdminClient() {
  if (!sharedAdminClient) {
    sharedAdminClient = createAdminClient()
  }

  return sharedAdminClient
}

async function isInAppNotificationEnabled(
  adminClient: AdminClient,
  userId: string,
  type: NotificationType
) {
  const { data, error } = await adminClient
    .from("user_notification_prefs")
    .select("inapp_enabled")
    .eq("user_id", userId)
    .eq("type", type)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data?.inapp_enabled ?? true
}

export async function createNotification(
  input: CreateNotificationInput,
  adminClient?: AdminClient
): Promise<CreateNotificationResult> {
  const client = adminClient ?? getAdminClient()
  const enabled = await isInAppNotificationEnabled(client, input.userId, input.type)
  if (!enabled) {
    return { data: null, error: null, skipped: true }
  }

  const { data, error } = await client
    .from("notifications")
    .insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      data: input.data ?? null,
    })
    .select("id, user_id, type, title, message, data, is_read, created_at")
    .single()

  return {
    data: (data as Notification | null) ?? null,
    error: error ? new Error(error.message) : null,
    skipped: false,
  }
}

export async function markNotificationsAsRead(
  input: MarkNotificationAsReadInput,
  adminClient?: AdminClient
) {
  const client = adminClient ?? getAdminClient()

  let query = client
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", input.userId)
    .eq("is_read", false)

  if (input.type) {
    query = query.eq("type", input.type)
  }

  if (input.dataFilter) {
    query = query.contains("data", input.dataFilter)
  }

  return query
}
