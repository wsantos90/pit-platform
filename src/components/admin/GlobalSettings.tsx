"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  adminSettingDefinitions,
  formatSettingsDateTime,
  useSettingsTab,
} from "@/hooks/admin/useSettingsTab"

export default function GlobalSettings() {
  const { error, isLoading, isSaving, lastUpdatedAt, onSave, success, updateValue, values } = useSettingsTab()

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
            {adminSettingDefinitions.map((definition) => (
              <div key={definition.key} className="space-y-2">
                <Label htmlFor={`setting-${definition.key}`}>{definition.label}</Label>
                <p className="text-xs text-foreground-muted">{definition.description}</p>
                <Input
                  id={`setting-${definition.key}`}
                  type="number"
                  min={definition.min}
                  step={definition.step}
                  value={values[definition.key]}
                  onChange={(event) => updateValue(definition.key, event.target.value)}
                />
              </div>
            ))}
          </div>
        )}

        {lastUpdatedAt ? (
          <p className="text-xs text-foreground-muted">Ultima atualizacao: {formatSettingsDateTime(lastUpdatedAt)}</p>
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
