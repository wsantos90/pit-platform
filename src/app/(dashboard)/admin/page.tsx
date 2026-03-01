'use client'

import { lazy, Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CreditCard, DollarSign, LayoutDashboard, Radar, Search, Settings } from "lucide-react"
import { RoleGuard } from "@/components/layout/RoleGuard"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { adminTabs, normalizeAdminTab, type AdminTab } from "./tabs"

const DashboardTabPanel = lazy(() => import("./components/DashboardTabPanel"))
const DiscoveryTabPanel = lazy(() => import("./components/DiscoveryTabPanel"))
const ManualIdTabPanel = lazy(() => import("./components/ManualIdTabPanel"))
const FinancialTabPanel = lazy(() => import("./components/FinancialTabPanel"))
const SettingsTabPanel = lazy(() => import("./components/SettingsTabPanel"))
const SubscriptionsTabPanel = lazy(() => import("./components/SubscriptionsTabPanel"))

type TabMeta = {
  value: AdminTab
  label: string
  icon: typeof LayoutDashboard
}

const tabMeta: TabMeta[] = [
  { value: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { value: "discovery", label: "Discovery", icon: Radar },
  { value: "manual-id", label: "Manual ID", icon: Search },
  { value: "financial", label: "Financial", icon: DollarSign },
  { value: "settings", label: "Settings", icon: Settings },
  { value: "subscriptions", label: "Subscriptions", icon: CreditCard },
]

function setUrlTab(tab: AdminTab, replace = false) {
  if (typeof window === "undefined") return
  const url = new URL(window.location.href)
  url.hash = tab
  url.searchParams.delete("tab")

  if (replace) {
    window.history.replaceState(null, "", url)
    return
  }

  window.history.pushState(null, "", url)
}

function getTabFromLocation(searchTab: string | null): AdminTab {
  if (typeof window === "undefined") return "dashboard"
  const hashTab = normalizeAdminTab(window.location.hash.replace("#", ""))
  const queryTab = normalizeAdminTab(searchTab)
  return hashTab ?? queryTab ?? "dashboard"
}

function AdminTabFallback() {
  return (
    <Card className="rounded-xl border border-border bg-card">
      <CardContent className="py-6">
        <p className="text-sm text-foreground-secondary">Carregando...</p>
      </CardContent>
    </Card>
  )
}

export default function AdminPage() {
  const searchParams = useSearchParams()
  const searchTab = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard")

  useEffect(() => {
    const resolvedTab = getTabFromLocation(searchTab)
    setActiveTab(resolvedTab)
    setUrlTab(resolvedTab, true)
  }, [searchTab])

  const defaultTab = useMemo<AdminTab>(() => {
    const fallbackTab = normalizeAdminTab(searchTab)
    return fallbackTab ?? adminTabs[0]
  }, [searchTab])

  return (
    <RoleGuard requiredRoles={["admin"]}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-4 md:px-6 md:py-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground md:text-3xl">Admin</h1>
          <p className="text-sm text-foreground-secondary">
            Painel de operacao com controle de discovery, financeiro e configuracoes.
          </p>
        </header>

        <Tabs
          value={activeTab}
          defaultValue={defaultTab}
          onValueChange={(value) => {
            const nextTab = normalizeAdminTab(value)
            if (!nextTab) return
            setActiveTab(nextTab)
            setUrlTab(nextTab)
          }}
          className="space-y-4"
        >
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 md:grid-cols-6">
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

          <TabsContent value="dashboard">
            <Suspense fallback={<AdminTabFallback />}>
              <DashboardTabPanel />
            </Suspense>
          </TabsContent>

          <TabsContent value="discovery">
            <Suspense fallback={<AdminTabFallback />}>
              <DiscoveryTabPanel />
            </Suspense>
          </TabsContent>

          <TabsContent value="manual-id">
            <Suspense fallback={<AdminTabFallback />}>
              <ManualIdTabPanel />
            </Suspense>
          </TabsContent>

          <TabsContent value="financial">
            <Suspense fallback={<AdminTabFallback />}>
              <FinancialTabPanel />
            </Suspense>
          </TabsContent>

          <TabsContent value="settings">
            <Suspense fallback={<AdminTabFallback />}>
              <SettingsTabPanel />
            </Suspense>
          </TabsContent>

          <TabsContent value="subscriptions">
            <Suspense fallback={<AdminTabFallback />}>
              <SubscriptionsTabPanel />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  )
}

