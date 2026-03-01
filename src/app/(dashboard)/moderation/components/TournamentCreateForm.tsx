'use client'

import { FormEvent, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type TournamentFormat = "single_elimination" | "group_stage_then_knockout" | "round_robin"
type TournamentType = "corujao" | "league"

export type TournamentSummary = {
  id: string
  name: string
  type: TournamentType
  format: TournamentFormat
  status: string
  capacity_min: number
  capacity_max: number
  group_count: number | null
  scheduled_date: string
  start_time: string
  entry_fee: number
  current_round: string | null
  created_by: string
  created_at: string
  updated_at: string
  entries_count?: number
  paid_entries_count?: number
}

interface TournamentCreateFormProps {
  onCreated: (tournament: TournamentSummary) => void
  onCancel: () => void
}

const initialState = {
  name: "",
  type: "corujao" as TournamentType,
  format: "single_elimination" as TournamentFormat,
  capacityMin: "8",
  capacityMax: "32",
  groupCount: "2",
  scheduledDate: "",
  startTime: "22:00",
  entryFee: "3",
}

export default function TournamentCreateForm({ onCreated, onCancel }: TournamentCreateFormProps) {
  const [form, setForm] = useState(initialState)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/moderation/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          format: form.format,
          capacity_min: Number(form.capacityMin),
          capacity_max: Number(form.capacityMax),
          group_count: form.format === "group_stage_then_knockout" ? Number(form.groupCount) : null,
          scheduled_date: form.scheduledDate,
          start_time: form.startTime,
          entry_fee: Number(form.entryFee),
        }),
      })

      const payload = (await response.json()) as {
        tournament?: TournamentSummary
        error?: string
      }

      if (!response.ok || !payload.tournament) {
        throw new Error(payload.error ?? "Failed to create tournament")
      }

      onCreated(payload.tournament)
      setForm(initialState)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to create tournament")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="tournament-name">Nome do torneio</Label>
          <Input
            id="tournament-name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Ex: Corujao de Sexta"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tournament-type">Tipo</Label>
          <select
            id="tournament-type"
            value={form.type}
            onChange={(event) =>
              setForm((current) => ({ ...current, type: event.target.value as TournamentType }))
            }
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="corujao">Corujao</option>
            <option value="league">League</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tournament-format">Formato</Label>
          <select
            id="tournament-format"
            value={form.format}
            onChange={(event) =>
              setForm((current) => ({ ...current, format: event.target.value as TournamentFormat }))
            }
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="single_elimination">Single Elimination</option>
            <option value="round_robin">Round Robin</option>
            <option value="group_stage_then_knockout">Group Stage + Knockout</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="capacity-min">Capacidade minima</Label>
          <Input
            id="capacity-min"
            type="number"
            min={2}
            value={form.capacityMin}
            onChange={(event) => setForm((current) => ({ ...current, capacityMin: event.target.value }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="capacity-max">Capacidade maxima</Label>
          <Input
            id="capacity-max"
            type="number"
            min={2}
            value={form.capacityMax}
            onChange={(event) => setForm((current) => ({ ...current, capacityMax: event.target.value }))}
            required
          />
        </div>

        {form.format === "group_stage_then_knockout" ? (
          <div className="space-y-2">
            <Label htmlFor="group-count">Quantidade de grupos</Label>
            <Input
              id="group-count"
              type="number"
              min={2}
              value={form.groupCount}
              onChange={(event) => setForm((current) => ({ ...current, groupCount: event.target.value }))}
              required
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="scheduled-date">Data</Label>
          <Input
            id="scheduled-date"
            type="date"
            value={form.scheduledDate}
            onChange={(event) => setForm((current) => ({ ...current, scheduledDate: event.target.value }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="start-time">Horario</Label>
          <Input
            id="start-time"
            type="time"
            value={form.startTime}
            onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="entry-fee">Taxa de entrada</Label>
          <Input
            id="entry-fee"
            type="number"
            min={0}
            step="0.01"
            value={form.entryFee}
            onChange={(event) => setForm((current) => ({ ...current, entryFee: event.target.value }))}
            required
          />
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting} aria-busy={submitting}>
          {submitting ? "Criando..." : "Criar torneio"}
        </Button>
      </div>
    </form>
  )
}
