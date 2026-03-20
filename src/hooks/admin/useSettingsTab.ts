import { useCallback, useEffect, useState } from "react"
import { z } from "zod"

const settingDefinitions = [
  {
    key: "discovery_max_targets",
    label: "Discovery max targets",
    description: "Total de clubes escaneados por varredura",
    min: "1",
    step: "1",
  },
  {
    key: "discovery_batch_size",
    label: "Discovery batch size",
    description: "Clubes processados em paralelo por lote",
    min: "1",
    step: "1",
  },
  {
    key: "discovery_rate_limit_ms",
    label: "Discovery rate limit (ms)",
    description: "Delay entre lotes em milissegundos",
    min: "1",
    step: "1",
  },
  {
    key: "max_claims_per_club",
    label: "Max claims por clube",
    description: "Numero maximo de tentativas de claim por clube",
    min: "1",
    step: "1",
  },
  {
    key: "tournament_entry_fee_brl",
    label: "Taxa default torneio (BRL)",
    description: "Valor padrao de entrada em torneios",
    min: "0",
    step: "0.01",
  },
] as const

export type SettingKey = (typeof settingDefinitions)[number]["key"]

type AdminSetting = {
  key: string
  value: unknown
  description: string | null
  updated_at: string | null
}

type SettingsPayload = {
  settings: AdminSetting[]
}

export const defaultSettingFormValues: Record<SettingKey, string> = {
  discovery_max_targets: "20",
  discovery_batch_size: "10",
  discovery_rate_limit_ms: "1500",
  max_claims_per_club: "3",
  tournament_entry_fee_brl: "29.90",
}

export const adminSettingDefinitions = settingDefinitions

const settingsSchema = z.object({
  discovery_max_targets: z.coerce.number().int().min(1).max(500),
  discovery_batch_size: z.coerce.number().int().min(1).max(10000),
  discovery_rate_limit_ms: z.coerce.number().int().min(1).max(120000),
  max_claims_per_club: z.coerce.number().int().min(1).max(100),
  tournament_entry_fee_brl: z.coerce.number().min(0).max(100000),
})

const settingKeySet = new Set<SettingKey>(settingDefinitions.map((definition) => definition.key))

function isSettingKey(value: string): value is SettingKey {
  return settingKeySet.has(value as SettingKey)
}

function valueToInput(key: SettingKey, value: unknown) {
  const resolvedNumber = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(resolvedNumber)) {
    return defaultSettingFormValues[key]
  }

  if (key === "tournament_entry_fee_brl") {
    return resolvedNumber.toFixed(2)
  }

  return String(Math.trunc(resolvedNumber))
}

export function formatSettingsDateTime(value: string | null) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  return parsed.toLocaleString("pt-BR")
}

export function useSettingsTab() {
  const [values, setValues] = useState<Record<SettingKey, string>>(defaultSettingFormValues)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/settings", {
        method: "GET",
        cache: "no-store",
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "failed_to_load_admin_settings")
      }

      const payload = (await response.json()) as SettingsPayload
      const nextValues: Record<SettingKey, string> = { ...defaultSettingFormValues }

      let newestUpdatedAt: string | null = null
      for (const setting of payload.settings ?? []) {
        if (!isSettingKey(setting.key)) continue
        nextValues[setting.key] = valueToInput(setting.key, setting.value)

        if (setting.updated_at && (!newestUpdatedAt || setting.updated_at > newestUpdatedAt)) {
          newestUpdatedAt = setting.updated_at
        }
      }

      setValues(nextValues)
      setLastUpdatedAt(newestUpdatedAt)
      setError(null)
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "failed_to_load_admin_settings"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchSettings()
  }, [fetchSettings])

  const updateValue = useCallback((key: SettingKey, value: string) => {
    setValues((current) => ({
      ...current,
      [key]: value,
    }))
  }, [])

  const onSave = useCallback(async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    const parsed = settingsSchema.safeParse(values)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      setError(issue?.message ?? "Valores invalidos no formulario.")
      setIsSaving(false)
      return
    }

    try {
      for (const definition of settingDefinitions) {
        const response = await fetch("/api/admin/settings", {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            key: definition.key,
            value: parsed.data[definition.key],
          }),
        })

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null
          throw new Error(body?.error ?? "failed_to_save_admin_setting")
        }
      }

      setSuccess("Configuracoes salvas com sucesso.")
      await fetchSettings()
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "failed_to_save_admin_setting"
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }, [fetchSettings, values])

  return {
    error,
    isLoading,
    isSaving,
    lastUpdatedAt,
    onSave,
    success,
    updateValue,
    values,
  }
}
