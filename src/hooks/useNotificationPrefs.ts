'use client'

import { useEffect, useMemo, useState } from "react"
import { NOTIFICATION_PREFERENCE_OPTIONS } from "@/lib/notifications/constants"
import { createClient } from "@/lib/supabase/client"
import type { NotificationType } from "@/types/database"

type PreferenceMap = Partial<Record<NotificationType, boolean>>

export function useNotificationPrefs(userId: string | null) {
  const supabase = useMemo(() => createClient(), [])
  const [preferences, setPreferences] = useState<PreferenceMap>({})
  const [loading, setLoading] = useState(true)
  const [savingType, setSavingType] = useState<NotificationType | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      return
    }

    let active = true

    const load = async () => {
      setLoading(true)
      setErrorMessage(null)

      const { data, error } = await supabase
        .from("user_notification_prefs")
        .select("type, inapp_enabled")
        .eq("user_id", userId)

      if (!active) return

      if (error) {
        setErrorMessage("Nao foi possivel carregar suas preferencias agora.")
        setPreferences({})
        setLoading(false)
        return
      }

      const nextPreferences: PreferenceMap = {}
      for (const row of data ?? []) {
        nextPreferences[row.type as NotificationType] = Boolean(row.inapp_enabled)
      }

      setPreferences(nextPreferences)
      setLoading(false)
    }

    void load()

    return () => {
      active = false
    }
  }, [supabase, userId])

  const items = useMemo(
    () =>
      NOTIFICATION_PREFERENCE_OPTIONS.map((option) => ({
        ...option,
        inappEnabled: (userId ? preferences : {})[option.type] ?? true,
      })),
    [preferences, userId]
  )

  const setInAppEnabled = async (type: NotificationType, inappEnabled: boolean) => {
    if (!userId) return false

    const previousValue = preferences[type] ?? true
    setSavingType(type)
    setErrorMessage(null)
    setPreferences((current) => ({ ...current, [type]: inappEnabled }))

    const { error } = await supabase.from("user_notification_prefs").upsert(
      {
        user_id: userId,
        type,
        inapp_enabled: inappEnabled,
      },
      {
        onConflict: "user_id,type",
      }
    )

    setSavingType(null)

    if (error) {
      setPreferences((current) => ({ ...current, [type]: previousValue }))
      setErrorMessage("Nao foi possivel salvar a preferencia agora.")
      return false
    }

    return true
  }

  return {
    items,
    loading: userId ? loading : false,
    savingType,
    errorMessage,
    setInAppEnabled,
  }
}
