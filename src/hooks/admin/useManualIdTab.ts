import { useState } from "react"

type PreviewMatch = {
  matchId: string
  homeClub: string
  awayClub: string
  score: string
  date: string
}

export type ManualClubPreview = {
  clubId: string
  clubName: string
  recentMatches: PreviewMatch[]
}

export type ExistingClub = {
  id: string
  ea_club_id: string
  display_name: string
  status: string
  discovered_via: string | null
}

export function useManualIdTab() {
  const [clubId, setClubId] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [preview, setPreview] = useState<ManualClubPreview | null>(null)
  const [existingClub, setExistingClub] = useState<ExistingClub | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function onSearch() {
    const trimmedClubId = clubId.trim()
    if (!trimmedClubId) {
      setError("Informe um clubId valido.")
      return
    }

    setIsSearching(true)
    setError(null)
    setSuccess(null)
    setExistingClub(null)
    setPreview(null)
    setShowConfirmModal(false)

    try {
      const response = await fetch(`/api/admin/manual-club?clubId=${encodeURIComponent(trimmedClubId)}`, {
        method: "GET",
        cache: "no-store",
      })
      const payload = (await response.json().catch(() => null)) as
        | ManualClubPreview
        | { alreadyExists: true; club: ExistingClub }
        | { error?: string; details?: string }
        | null

      if (!response.ok) {
        const errorMessage =
          (payload as { error?: string; details?: string } | null)?.details ??
          (payload as { error?: string } | null)?.error ??
          "Nao foi possivel buscar partidas para esse clubId."
        throw new Error(errorMessage)
      }

      if (payload && "alreadyExists" in payload && payload.alreadyExists) {
        setExistingClub(payload.club)
        setDisplayName(payload.club.display_name)
        return
      }

      const previewPayload = payload as ManualClubPreview
      setPreview(previewPayload)
      setDisplayName(previewPayload.clubName)
    } catch (requestError) {
      setPreview(null)
      setExistingClub(null)
      setDisplayName("")
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nao foi possivel buscar partidas para esse clubId."
      )
    } finally {
      setIsSearching(false)
    }
  }

  async function onConfirmInsert() {
    if (!preview) return

    const trimmedDisplayName = displayName.trim()
    if (trimmedDisplayName.length < 2) {
      setError("displayName deve ter pelo menos 2 caracteres.")
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/admin/manual-club", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clubId: preview.clubId,
          displayName: trimmedDisplayName,
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | { success?: boolean; alreadyExists?: boolean; club?: ExistingClub; error?: string; details?: string }
        | null

      if (!response.ok || !payload?.success) {
        const errorMessage =
          payload?.details ?? payload?.error ?? "Nao foi possivel inserir o clube manualmente."
        throw new Error(errorMessage)
      }

      if (payload.alreadyExists && payload.club) {
        setExistingClub(payload.club)
        setPreview(null)
        setDisplayName(payload.club.display_name)
        setShowConfirmModal(false)
        setSuccess(null)
        return
      }

      setExistingClub(null)
      setSuccess(`Clube ${trimmedDisplayName} inserido com sucesso em discovered_clubs.`)
      setShowConfirmModal(false)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nao foi possivel inserir o clube manualmente."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    clubId,
    displayName,
    error,
    existingClub,
    isSearching,
    isSubmitting,
    onConfirmInsert,
    onSearch,
    preview,
    setClubId,
    setDisplayName,
    setShowConfirmModal,
    showConfirmModal,
    success,
  }
}
