'use client'

import { useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Notification } from "@/types/database"

const POLL_INTERVAL = 30_000

type NotificationSnapshot = {
  notifications: Notification[]
  unreadCount: number
}

export function sortNotifications(notifications: Notification[]) {
  return [...notifications].sort((left, right) => right.created_at.localeCompare(left.created_at))
}

export function upsertNotification(notifications: Notification[], incoming: Notification, limit: number) {
  const next = notifications.filter((notification) => notification.id !== incoming.id)
  next.unshift(incoming)
  return sortNotifications(next).slice(0, limit)
}

function mergeUpdatedNotification(notifications: Notification[], incoming: Notification, limit: number) {
  const sortedNotifications = sortNotifications(notifications)
  const existingIndex = sortedNotifications.findIndex((notification) => notification.id === incoming.id)

  if (existingIndex >= 0) {
    const next = [...sortedNotifications]
    next[existingIndex] = { ...next[existingIndex], ...incoming }
    return sortNotifications(next).slice(0, limit)
  }

  if (sortedNotifications.length < limit) {
    return upsertNotification(sortedNotifications, incoming, limit)
  }

  const oldestNotification = sortedNotifications[sortedNotifications.length - 1]
  if (incoming.created_at.localeCompare(oldestNotification.created_at) > 0) {
    return upsertNotification(sortedNotifications, incoming, limit)
  }

  return sortedNotifications
}

export function applyNotificationInsert(
  snapshot: NotificationSnapshot,
  incoming: Notification,
  limit: number
): NotificationSnapshot {
  return {
    notifications: upsertNotification(snapshot.notifications, incoming, limit),
    unreadCount: incoming.is_read ? snapshot.unreadCount : snapshot.unreadCount + 1,
  }
}

export function applyNotificationUpdate(
  snapshot: NotificationSnapshot,
  incoming: Notification,
  previous: Partial<Notification> | null | undefined,
  limit: number
): NotificationSnapshot {
  const existingNotification = snapshot.notifications.find((notification) => notification.id === incoming.id)
  const previousIsRead =
    existingNotification?.is_read ??
    (typeof previous?.is_read === "boolean" ? previous.is_read : undefined)

  let unreadCount = snapshot.unreadCount
  if (typeof previousIsRead === "boolean" && previousIsRead !== incoming.is_read) {
    unreadCount = incoming.is_read ? Math.max(0, unreadCount - 1) : unreadCount + 1
  }

  return {
    notifications: mergeUpdatedNotification(snapshot.notifications, incoming, limit),
    unreadCount,
  }
}

export function markNotificationAsReadLocally(
  snapshot: NotificationSnapshot,
  notificationId: string
): NotificationSnapshot {
  let changed = false

  const notifications = snapshot.notifications.map((notification) => {
    if (notification.id !== notificationId || notification.is_read) {
      return notification
    }

    changed = true
    return { ...notification, is_read: true }
  })

  if (!changed) {
    return snapshot
  }

  return {
    notifications,
    unreadCount: Math.max(0, snapshot.unreadCount - 1),
  }
}

export function rollbackNotificationRead(
  snapshot: NotificationSnapshot,
  originalNotification: Notification
): NotificationSnapshot {
  let restored = false

  const notifications = snapshot.notifications.map((notification) => {
    if (notification.id !== originalNotification.id) {
      return notification
    }

    if (notification.is_read === originalNotification.is_read) {
      return notification
    }

    restored = true
    return originalNotification
  })

  if (!restored) {
    return snapshot
  }

  return {
    notifications,
    unreadCount: originalNotification.is_read ? snapshot.unreadCount : snapshot.unreadCount + 1,
  }
}

export function useNotifications(userId: string | null, limit = 10) {
  const supabase = useMemo(() => createClient(), [])
  const [snapshot, setSnapshot] = useState<NotificationSnapshot>({ notifications: [], unreadCount: 0 })
  const [loading, setLoading] = useState(true)
  const snapshotRef = useRef<NotificationSnapshot>({ notifications: [], unreadCount: 0 })

  const commitSnapshot = (
    valueOrUpdater:
      | NotificationSnapshot
      | ((current: NotificationSnapshot) => NotificationSnapshot)
  ) => {
    setSnapshot((current) => {
      const next =
        typeof valueOrUpdater === "function"
          ? (valueOrUpdater as (current: NotificationSnapshot) => NotificationSnapshot)(current)
          : valueOrUpdater

      snapshotRef.current = next
      return next
    })
  }

  useEffect(() => {
    if (!userId) {
      const emptySnapshot = { notifications: [], unreadCount: 0 }
      snapshotRef.current = emptySnapshot
      setSnapshot(emptySnapshot)
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)

    const poll = async () => {
      const [listResult, countResult] = await Promise.all([
        supabase
          .from("notifications")
          .select("id, user_id, type, title, message, data, is_read, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(limit),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("is_read", false),
      ])

      if (!active) return

      if (listResult.error || countResult.error) {
        setLoading(false)
        return
      }

      const notifications = sortNotifications((listResult.data as Notification[] | null) ?? []).slice(0, limit)

      commitSnapshot({
        notifications,
        unreadCount:
          typeof countResult.count === "number"
            ? countResult.count
            : notifications.filter((notification) => !notification.is_read).length,
      })
      setLoading(false)
    }

    void poll()

    const intervalId = setInterval(() => {
      void poll()
    }, POLL_INTERVAL)

    return () => {
      active = false
      clearInterval(intervalId)
    }
  }, [limit, supabase, userId])

  const markAsRead = async (notificationId: string) => {
    if (!userId) return false

    const currentNotification = snapshotRef.current.notifications.find(
      (notification) => notification.id === notificationId
    )
    if (!currentNotification || currentNotification.is_read) {
      return true
    }

    commitSnapshot((current) => markNotificationAsReadLocally(current, notificationId))

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", userId)
      .eq("is_read", false)

    if (error) {
      commitSnapshot((current) => rollbackNotificationRead(current, currentNotification))
      return false
    }

    return true
  }

  return {
    notifications: snapshot.notifications,
    unreadCount: snapshot.unreadCount,
    loading,
    markAsRead,
  }
}
