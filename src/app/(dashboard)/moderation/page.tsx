'use client'

import { lazy, Suspense, useMemo, useSyncExternalStore } from "react"
import { useSearchParams } from "next/navigation"
import { Gavel, ShieldCheck, Trophy, Users } from "lucide-react"
import { RoleGuard } from "@/components/layout/RoleGuard"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { moderationTabs, normalizeModerationTab, type ModerationTab } from "./tabs"

const ClaimsTabPanel = lazy(() => import("./components/ClaimsTabPanel"))
const TournamentsTabPanel = lazy(() => import("./components/TournamentsTabPanel"))
const DisputesTabPanel = lazy(() => import("./components/DisputesTabPanel"))
const UsersTabPanel = lazy(() => import("./components/UsersTabPanel"))

type TabMeta = {
  value: ModerationTab
  label: string
  icon: typeof ShieldCheck
}

const tabMeta: TabMeta[] = [
  { value: "claims", label: "Claims", icon: ShieldCheck },
  { value: "tournaments", label: "Torneios", icon: Trophy },
  { value: "disputes", label: "Disputas", icon: Gavel },
  { value: "users", label: "Usuarios", icon: Users },
]

function setUrlTab(tab: ModerationTab, replace = false) {
  if (typeof window === "undefined") return
  const url = new URL(window.location.href)
  url.hash = tab
  url.searchParams.delete("tab")

  if (replace) {
    window.history.replaceState(null, "", url)
    window.dispatchEvent(new Event("hashchange"))
    return
  }

  window.history.pushState(null, "", url)
  window.dispatchEvent(new Event("hashchange"))
}

function getTabFromLocation(searchTab: string | null): ModerationTab {
  if (typeof window === "undefined") return "claims"
  const hashTab = normalizeModerationTab(window.location.hash.replace("#", ""))
  const queryTab = normalizeModerationTab(searchTab)
  return hashTab ?? queryTab ?? "claims"
}

function ModerationTabFallback() {
  return (
    <Card className="rounded-xl border border-border bg-card">
      <CardContent className="py-6">
        <p className="text-sm text-foreground-secondary">Carregando secao...</p>
      </CardContent>
    </Card>
  )
}

export default function ModerationPage() {
  const searchParams = useSearchParams()
  const searchTab = searchParams.get("tab")
  const activeTab = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {}
      window.addEventListener("hashchange", onStoreChange)
      window.addEventListener("popstate", onStoreChange)
      return () => {
        window.removeEventListener("hashchange", onStoreChange)
        window.removeEventListener("popstate", onStoreChange)
      }
    },
    () => getTabFromLocation(searchTab),
    () => "claims"
  )

  const defaultTab = useMemo<ModerationTab>(() => {
    const fallbackTab = normalizeModerationTab(searchTab)
    return fallbackTab ?? moderationTabs[0]
  }, [searchTab])

  return (
    <RoleGuard requiredRoles={["moderator", "admin"]}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-4 md:px-6 md:py-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground md:text-3xl">Moderacao</h1>
          <p className="text-sm text-foreground-secondary">
            Gerencie claims, torneios, disputas e usuarios em um unico painel.
          </p>
        </header>

        <Tabs
          value={activeTab}
          defaultValue={defaultTab}
          onValueChange={(value) => {
            const nextTab = normalizeModerationTab(value)
            if (!nextTab) return
            setUrlTab(nextTab)
          }}
          className="space-y-4"
        >
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 md:grid-cols-4">
            {tabMeta.map((tab) => {
              const Icon = tab.icon
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="h-10 rounded-lg border border-border bg-card px-3 text-foreground data-[state=active]:border-primary data-[state=active]:bg-primary/10"
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          <TabsContent value="claims">
            <Suspense fallback={<ModerationTabFallback />}>
              <ClaimsTabPanel />
            </Suspense>
          </TabsContent>

          <TabsContent value="tournaments">
            <Suspense fallback={<ModerationTabFallback />}>
              <TournamentsTabPanel />
            </Suspense>
          </TabsContent>

          <TabsContent value="disputes">
            <Suspense fallback={<ModerationTabFallback />}>
              <DisputesTabPanel />
            </Suspense>
          </TabsContent>

          <TabsContent value="users">
            <Suspense fallback={<ModerationTabFallback />}>
              <UsersTabPanel />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  )
}

