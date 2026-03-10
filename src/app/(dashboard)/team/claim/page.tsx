"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, Loader2, Search, Upload, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { RoleGuard } from "@/components/layout/RoleGuard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

// ─── Types ────────────────────────────────────────────────────────────────────

type DiscoveredClub = {
  id: string
  display_name: string
  ea_club_id: string
  status: "unclaimed" | "pending" | "active" | "suspended" | "banned"
}

type MatchPreview = {
  matchId: string
  date: string
  opponent: string
  goalsFor: number
  goalsAgainst: number
  result: "W" | "D" | "L"
}

type Step = "search" | "preview" | "upload"

// ─── Step 1: Search ───────────────────────────────────────────────────────────

function SearchStep({ onSelect }: { onSelect: (club: DiscoveredClub) => void }) {
  const supabase = useMemo(() => createClient(), [])
  const [query, setQuery] = useState("")
  const [clubs, setClubs] = useState<DiscoveredClub[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadClubs = useCallback(
    async (term: string) => {
      setLoading(true)
      setError(null)
      try {
        const clean = term.trim()
        const base = supabase
          .from("discovered_clubs")
          .select("id,display_name,ea_club_id,status")
          .in("status", ["unclaimed", "pending"])
          .order("display_name", { ascending: true })
          .limit(20)

        const { data, error: err } =
          clean.length >= 2 ? await base.ilike("display_name", `%${clean}%`) : await base

        if (err) {
          setError("Não foi possível carregar os times.")
          setClubs([])
          return
        }
        setClubs((data ?? []) as DiscoveredClub[])
      } catch {
        setError("Falha de rede ao buscar os times.")
        setClubs([])
      } finally {
        setLoading(false)
      }
    },
    [supabase]
  )

  useEffect(() => {
    const t = setTimeout(() => void loadClubs(query), 250)
    return () => clearTimeout(t)
  }, [loadClubs, query])

  return (
    <Card className="rounded-xl border border-border bg-card">
      <CardHeader className="space-y-2">
        <CardTitle className="text-base font-semibold">Buscar Time</CardTitle>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite ao menos 2 letras do nome do time"
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Buscando times...</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : clubs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum time encontrado. Tente outro termo.
          </p>
        ) : (
          clubs.map((club) => (
            <button
              key={club.id}
              type="button"
              onClick={() => onSelect(club)}
              className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-left text-sm transition hover:bg-muted/50"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{club.display_name}</span>
                {club.status === "pending" && (
                  <span className="text-xs text-yellow-500">Em análise</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">EA ID: {club.ea_club_id}</p>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  )
}

// ─── Step 2: Preview ──────────────────────────────────────────────────────────

function PreviewStep({
  club,
  onConfirm,
  onBack,
}: {
  club: DiscoveredClub
  onConfirm: () => void
  onBack: () => void
}) {
  const [matches, setMatches] = useState<MatchPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    Promise.resolve().then(() => {
      if (!active) return
      setLoading(true)
      setError(null)
      setMatches([])
    })

    fetch(`/api/claim/preview?eaClubId=${encodeURIComponent(club.ea_club_id)}`)
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as
          | { matches?: MatchPreview[]; error?: string }
          | null
        if (!active) return
        if (!res.ok || !body?.matches) {
          setError(body?.error ?? "Não foi possível carregar as partidas.")
          return
        }
        setMatches(body.matches)
      })
      .catch(() => {
        if (active) setError("Falha de rede ao carregar partidas.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [club.ea_club_id])

  const resultColor = (r: "W" | "D" | "L") =>
    r === "W"
      ? "text-emerald-500"
      : r === "L"
        ? "text-destructive"
        : "text-muted-foreground"

  return (
    <Card className="rounded-xl border border-border bg-card">
      <CardHeader className="space-y-1">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Voltar
        </button>
        <CardTitle className="text-base font-semibold">
          Últimas partidas — {club.display_name}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Confirme se este é mesmo o seu time antes de continuar.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando partidas da EA...
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma partida encontrada para este time.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4">Data</th>
                  <th className="pb-2 pr-4">Adversário</th>
                  <th className="pb-2 pr-4 text-center">Placar</th>
                  <th className="pb-2 text-center">Res.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {matches.map((m) => (
                  <tr key={m.matchId}>
                    <td className="py-1.5 pr-4 text-xs text-muted-foreground">{m.date}</td>
                    <td className="py-1.5 pr-4">{m.opponent}</td>
                    <td className="py-1.5 pr-4 text-center">
                      {m.goalsFor} × {m.goalsAgainst}
                    </td>
                    <td className={`py-1.5 text-center font-semibold ${resultColor(m.result)}`}>
                      {m.result}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && (
          <div className="flex gap-2 pt-2">
            <Button onClick={onConfirm} disabled={matches.length === 0}>
              Sim, é o meu time — Continuar
            </Button>
            <Button variant="outline" onClick={onBack}>
              Não é meu time
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Step 3: Upload ───────────────────────────────────────────────────────────

const MAX_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]

function UploadStep({
  club,
  onBack,
  onSuccess,
}: {
  club: DiscoveredClub
  onBack: () => void
  onSuccess: () => void
}) {
  const supabase = useMemo(() => createClient(), [])
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = useCallback((f: File) => {
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError("Apenas arquivos JPG, PNG ou WebP são aceitos.")
      return
    }
    if (f.size > MAX_SIZE_BYTES) {
      setError("O arquivo deve ter no máximo 5 MB.")
      return
    }
    setError(null)
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const f = e.dataTransfer.files[0]
      if (f) handleFile(f)
    },
    [handleFile]
  )

  const handleSubmit = useCallback(async () => {
    if (!file) return
    setUploading(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Sessão expirada. Faça login novamente.")

      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"
      const filePath = `${user.id}/${club.id}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from("claim-proofs")
        .upload(filePath, file, { upsert: false })

      if (uploadError) throw new Error(`Upload falhou: ${uploadError.message}`)

      const { data: signed, error: signError } = await supabase.storage
        .from("claim-proofs")
        .createSignedUrl(filePath, 60 * 60 * 24 * 365)

      if (signError || !signed?.signedUrl) {
        throw new Error("Não foi possível gerar URL do arquivo.")
      }

      const res = await fetch("/api/claim/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discoveredClubId: club.id,
          photoUrl: signed.signedUrl,
        }),
      })

      const body = (await res.json().catch(() => null)) as { error?: string } | null

      if (!res.ok) {
        const msg =
          body?.error === "club_has_pending_claim"
            ? "Esse time já possui uma reivindicação pendente."
            : body?.error === "club_already_claimed"
              ? "Esse time já foi reivindicado por outro usuário."
              : "Não foi possível enviar sua reivindicação."
        setError(msg)
        return
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado. Tente novamente.")
    } finally {
      setUploading(false)
    }
  }, [club.id, file, onSuccess, supabase])

  return (
    <Card className="rounded-xl border border-border bg-card">
      <CardHeader className="space-y-1">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Voltar
        </button>
        <CardTitle className="text-base font-semibold">Enviar Prova</CardTitle>
        <p className="text-xs text-muted-foreground">
          Envie um print ou foto comprovando que você é o capitão/manager de{" "}
          <strong>{club.display_name}</strong>.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border bg-background/30 hover:border-primary/50 hover:bg-muted/30"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
            }}
          />
          {preview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Preview da prova"
                className="max-h-48 max-w-full rounded-md object-contain"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setFile(null)
                  setPreview(null)
                  if (inputRef.current) inputRef.current.value = ""
                }}
                className="absolute right-1 top-1 rounded-full bg-background/80 p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">Arraste uma imagem ou clique para selecionar</p>
                <p className="text-xs text-muted-foreground">JPG, PNG ou WebP · máx. 5 MB</p>
              </div>
            </>
          )}
        </div>

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button onClick={() => void handleSubmit()} disabled={!file || uploading}>
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {uploading ? "Enviando..." : "Enviar reivindicação"}
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Page() {
  const [step, setStep] = useState<Step>("search")
  const [selectedClub, setSelectedClub] = useState<DiscoveredClub | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSelect = useCallback((club: DiscoveredClub) => {
    setSelectedClub(club)
    setStep("preview")
  }, [])

  const handleSuccess = useCallback(() => setSuccess(true), [])

  return (
    <RoleGuard requiredRoles={["player", "manager", "admin"]}>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-4 md:px-6 md:py-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground md:text-3xl">Reivindicar Time</h1>
          <p className="text-sm text-muted-foreground">
            Busque seu time, confirme os resultados e envie a prova para análise da moderação.
          </p>
          {!success && (
            <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
              {(["search", "preview", "upload"] as Step[]).map((s, i) => (
                <span key={s} className="flex items-center gap-1">
                  {i > 0 && <span>›</span>}
                  <span className={step === s ? "font-semibold text-foreground" : ""}>
                    {s === "search" ? "1. Busca" : s === "preview" ? "2. Prévia" : "3. Envio"}
                  </span>
                </span>
              ))}
            </div>
          )}
        </header>

        {success ? (
          <Card className="rounded-xl border border-emerald-500/40 bg-emerald-500/10">
            <CardContent className="py-6 text-center">
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                Reivindicação enviada com sucesso!
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Aguarde a análise da equipe de moderação. Você será notificado.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSuccess(false)
                  setStep("search")
                  setSelectedClub(null)
                }}
              >
                Reivindicar outro time
              </Button>
            </CardContent>
          </Card>
        ) : step === "search" ? (
          <SearchStep onSelect={handleSelect} />
        ) : step === "preview" && selectedClub ? (
          <PreviewStep
            club={selectedClub}
            onConfirm={() => setStep("upload")}
            onBack={() => setStep("search")}
          />
        ) : selectedClub ? (
          <UploadStep
            club={selectedClub}
            onBack={() => setStep("preview")}
            onSuccess={handleSuccess}
          />
        ) : null}
      </div>
    </RoleGuard>
  )
}
