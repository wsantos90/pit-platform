export type EaFetchTransport = "direct" | "browser_proxy"

function normalizeUrl(value: string | undefined) {
  return (value ?? "").replace(/\/+$/, "")
}

export function getCookieServiceUrl() {
  return normalizeUrl(process.env.COOKIE_SERVICE_URL)
}

export function getCookieServiceSecret() {
  return process.env.COOKIE_SERVICE_SECRET ?? ""
}

export function isCookieServiceConfigured() {
  return getCookieServiceUrl().length > 0
}

export function getEaFetchTransport(): EaFetchTransport {
  const configuredTransport = (process.env.EA_FETCH_TRANSPORT ?? "").trim().toLowerCase()

  if (configuredTransport === "browser_proxy" || configuredTransport === "direct") {
    return configuredTransport
  }

  return isCookieServiceConfigured() ? "browser_proxy" : "direct"
}
