'use client'

import { useCallback, useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type UserItem = {
  id: string
  email: string
  display_name: string | null
  roles: string[]
  is_active: boolean
  created_at: string
}

type ConfirmationState = {
  userId: string
  nextIsActive: boolean
  name: string
} | null

function roleClass(role: string) {
  if (role === "admin") return "bg-error-bg text-error border-error/30"
  if (role === "moderator") return "bg-info-bg text-info border-info/30"
  if (role === "manager") return "bg-primary/10 text-primary border-primary/30"
  return "bg-elevated text-foreground-secondary border-border"
}

function formatDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("pt-BR")
}

export default function UserManagement() {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<ConfirmationState>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(timer)
  }, [query])

  const loadUsers = useCallback(async (search: string) => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const params = new URLSearchParams()
      if (search.length > 0) params.set("q", search)
      params.set("limit", "20")

      const response = await fetch(`/api/moderation/users?${params.toString()}`, {
        method: "GET",
      })
      const payload = (await response.json()) as { users?: UserItem[]; error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao carregar usuarios")
      }
      setUsers(payload.users ?? [])
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao carregar usuarios")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadUsers(debouncedQuery)
  }, [debouncedQuery, loadUsers])

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [users]
  )

  async function toggleActive(userId: string, nextIsActive: boolean) {
    setUpdatingUserId(userId)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(`/api/moderation/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextIsActive }),
      })
      const payload = (await response.json()) as { error?: string; user?: UserItem }
      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao atualizar usuario")
      }

      setUsers((current) => current.map((row) => (row.id === userId ? { ...row, is_active: nextIsActive } : row)))
      setSuccess(nextIsActive ? "Usuario reativado com sucesso." : "Usuario desativado com sucesso.")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao atualizar usuario")
    } finally {
      setUpdatingUserId(null)
      setConfirmation(null)
    }
  }

  return (
    <Card className="rounded-xl border border-border bg-card">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base text-foreground">Gestao de usuarios</CardTitle>
            <CardDescription className="text-foreground-secondary">
              Busque usuarios e alterne o status ativo da conta.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" onClick={() => void loadUsers(debouncedQuery)} disabled={loading}>
            {loading ? "Carregando..." : "Atualizar"}
          </Button>
        </div>

        <div className="space-y-2">
          <label htmlFor="users-search" className="text-sm font-medium text-foreground-secondary">
            Buscar por nome ou email
          </label>
          <Input
            id="users-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Digite nome ou email..."
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {error ? (
          <p className="rounded-lg border border-error/40 bg-error-bg px-3 py-2 text-sm text-error">{error}</p>
        ) : null}
        {success ? (
          <p className="rounded-lg border border-success/40 bg-success-bg px-3 py-2 text-sm text-success">{success}</p>
        ) : null}

        {loading ? (
          <div className="space-y-2">
            <div className="h-12 animate-pulse rounded-lg bg-muted" />
            <div className="h-12 animate-pulse rounded-lg bg-muted" />
            <div className="h-12 animate-pulse rounded-lg bg-muted" />
          </div>
        ) : null}

        {!loading && sortedUsers.length === 0 ? (
          <p className="rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-foreground-secondary">
            Nenhum usuario encontrado para a busca atual.
          </p>
        ) : null}

        {!loading && sortedUsers.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table className="min-w-[920px]">
              <TableHeader className="bg-hover text-foreground-muted">
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Acao</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <p className="font-medium text-foreground">{user.display_name ?? "Sem nome"}</p>
                      <p className="text-xs text-foreground-muted">{user.id}</p>
                    </TableCell>
                    <TableCell className="text-foreground-secondary">{user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <Badge key={`${user.id}-${role}`} className={roleClass(role)}>
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          user.is_active
                            ? "bg-success-bg text-success border-success/30"
                            : "bg-error-bg text-error border-error/30"
                        }
                      >
                        {user.is_active ? "active" : "inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-foreground-muted">{formatDate(user.created_at)}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="sm"
                        variant={user.is_active ? "destructive" : "default"}
                        disabled={updatingUserId === user.id}
                        onClick={() =>
                          setConfirmation({
                            userId: user.id,
                            nextIsActive: !user.is_active,
                            name: user.display_name ?? user.email,
                          })
                        }
                      >
                        {user.is_active ? "Desativar" : "Reativar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </CardContent>

      {confirmation ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <Card className="w-full max-w-md rounded-xl border border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base text-foreground">
                {confirmation.nextIsActive ? "Reativar usuario" : "Desativar usuario"}
              </CardTitle>
              <CardDescription className="text-foreground-secondary">
                {confirmation.nextIsActive
                  ? `Deseja reativar "${confirmation.name}"?`
                  : `Deseja desativar "${confirmation.name}"?`}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmation(null)}
                disabled={updatingUserId === confirmation.userId}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant={confirmation.nextIsActive ? "default" : "destructive"}
                onClick={() => void toggleActive(confirmation.userId, confirmation.nextIsActive)}
                disabled={updatingUserId === confirmation.userId}
                aria-busy={updatingUserId === confirmation.userId}
              >
                {updatingUserId === confirmation.userId
                  ? "Salvando..."
                  : confirmation.nextIsActive
                    ? "Reativar"
                    : "Desativar"}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </Card>
  )
}

