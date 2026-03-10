const syncStatus = document.getElementById("sync-status")
const akBmscField = document.getElementById("ak-bmsc")
const bmSvField = document.getElementById("bm-sv")
const cookieCountField = document.getElementById("cookie-count")
const capturedAtField = document.getElementById("captured-at")
const lastSyncAtField = document.getElementById("last-sync-at")
const lastSyncErrorField = document.getElementById("last-sync-error")
const syncHintField = document.getElementById("sync-hint")
const refreshButton = document.getElementById("refresh-button")
const syncButton = document.getElementById("sync-button")
const buildModeField = document.getElementById("build-mode")
const cookieServiceLabelField = document.getElementById("cookie-service-label")

function formatDateTime(value) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString("pt-BR")
}

function setLoadingState(isLoading) {
  refreshButton.disabled = isLoading
  syncButton.disabled = isLoading
}

function renderSnapshot(snapshot) {
  akBmscField.value = snapshot.ak_bmsc || ""
  bmSvField.value = snapshot.bm_sv || ""
  cookieCountField.textContent = String(snapshot.cookieCount ?? 0)
  capturedAtField.textContent = formatDateTime(snapshot.capturedAt)
  lastSyncAtField.textContent = formatDateTime(snapshot.lastSyncAt)
  lastSyncErrorField.textContent = snapshot.lastSyncError || "-"
  buildModeField.textContent = snapshot.buildMode === "generated" ? "Operacional" : "Source / desenvolvimento"
  cookieServiceLabelField.textContent = snapshot.cookieServiceLabel || "Nao configurado"

  if (!snapshot.syncConfigured) {
    syncStatus.textContent = "Build sem sync configurado"
    syncStatus.dataset.tone = "warning"
    syncHintField.textContent = "Esta e a build de desenvolvimento. Para sync no Edge, carregue dist/edge-extension/ em vez de chrome-extension/."
    return
  }

  if (snapshot.lastSyncStatus === "success") {
    syncStatus.textContent = "Sync OK"
    syncStatus.dataset.tone = "success"
  } else if (snapshot.lastSyncStatus === "error") {
    syncStatus.textContent = "Sync com erro"
    syncStatus.dataset.tone = "error"
  } else if (snapshot.lastSyncStatus === "disabled") {
    syncStatus.textContent = "Sync desativado"
    syncStatus.dataset.tone = "warning"
  } else {
    syncStatus.textContent = "Pronto para sync"
    syncStatus.dataset.tone = "neutral"
  }

  syncHintField.textContent = "Use 'Sincronizar agora' antes de rodar o Discovery quando o proxy estiver sem cookies validos."
}

function sendMessage(type) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type }, resolve)
  })
}

async function refreshSnapshot() {
  setLoadingState(true)
  const response = await sendMessage("GET_COOKIE_SNAPSHOT")
  if (response?.ok && response.snapshot) {
    renderSnapshot(response.snapshot)
  }
  setLoadingState(false)
}

async function syncCookies() {
  setLoadingState(true)
  const response = await sendMessage("SYNC_COOKIES")
  if (response?.snapshot) {
    renderSnapshot(response.snapshot)
  }
  setLoadingState(false)
}

refreshButton.addEventListener("click", () => {
  void refreshSnapshot()
})

syncButton.addEventListener("click", () => {
  void syncCookies()
})

void refreshSnapshot()

