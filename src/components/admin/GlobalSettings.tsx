"use client"

import { useCallback, useEffect, useState } from "react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const settingDefinitions = [
  {
    key: "discovery_batch_size",
    label: "Discovery batch size",
    description: "Clubes por batch no discovery",
    min: "1",
    step: "1",
  },
  {
    key: "discovery_rate_limit_ms",
    label: "Discovery rate limit (ms)",
    description: "Delay entre batches em milissegundos",
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

type SettingKey = (typeof settingDefinitions)[number]["key"]

type AdminSetting = {
  key: string
  value: unknown
  description: string | null
  updated_at: string | null
}

type SettingsPayload = {
  settings: AdminSetting[]
}

const defaultFormValues: Record<SettingKey, string> = {
  discovery_batch_size: "10",
  discovery_rate_limit_ms: "1500",
  max_claims_per_club: "3",
  tournament_entry_fee_brl: "29.90",
}

const settingsSchema = z.object({
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
    return defaultFormValues[key]
  }

  if (key === "tournament_entry_fee_brl") {
    return resolvedNumber.toFixed(2)
  }

  return String(Math.trunc(resolvedNumber))
}

function formatDateTime(value: string | null) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "-"
  return parsed.toLocaleString("pt-BR")
}

export default function GlobalSettings() {
  const [values, setValues] = useState<Record<SettingKey, string>>(defaultFormValues)
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
      const nextValues: Record<SettingKey, string> = { ...defaultFormValues }

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

  async function onSave() {
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
  }

  return (
    <Card className="rounded-xl border border-border bg-card">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Configuracoes Globais</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-foreground-secondary">Carregando...</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {settingDefinitions.map((definition) => (
              <div key={definition.key} className="space-y-2">
                <Label htmlFor={`setting-${definition.key}`}>{definition.label}</Label>
                <p className="text-xs text-foreground-muted">{definition.description}</p>
                <Input
                  id={`setting-${definition.key}`}
                  type="number"
                  min={definition.min}
                  step={definition.step}
                  value={values[definition.key]}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [definition.key]: event.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>
        )}

        {lastUpdatedAt ? (
          <p className="text-xs text-foreground-muted">Ultima atualizacao: {formatDateTime(lastUpdatedAt)}</p>
        ) : null}

        {error ? <p className="text-sm text-destructive">Erro: {error}</p> : null}
        {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

        <div className="flex justify-end">
          <Button onClick={() => void onSave()} disabled={isLoading || isSaving}>
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
