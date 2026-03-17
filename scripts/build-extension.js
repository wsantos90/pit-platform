#!/usr/bin/env node
// @ts-check
"use strict"

const fs = require("fs")
const path = require("path")

const repoRoot = path.join(__dirname, "..")
const envPath = path.join(repoRoot, ".env.local")
const sourceDir = path.join(repoRoot, "browser-extension")
const outputDir = path.join(repoRoot, "dist", "browser-extension")

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split("\n")
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const separatorIndex = trimmed.indexOf("=")
    if (separatorIndex === -1) continue
    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim()
    if (!process.env[key]) process.env[key] = value
  }
}

const cookieServiceUrl = (process.env.COOKIE_SERVICE_URL ?? "").replace(/\/+$/, "")
const cookieServiceSecret = process.env.COOKIE_SERVICE_SECRET ?? ""

if (!cookieServiceUrl || !cookieServiceSecret) {
  console.error("COOKIE_SERVICE_URL ou COOKIE_SERVICE_SECRET nao definidos no .env.local")
  process.exit(1)
}

fs.rmSync(outputDir, { recursive: true, force: true })
fs.mkdirSync(outputDir, { recursive: true })
fs.cpSync(sourceDir, outputDir, { recursive: true })

const manifestPath = path.join(outputDir, "manifest.json")
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
manifest.host_permissions = Array.from(
  new Set([...(manifest.host_permissions ?? []), `${cookieServiceUrl}/*`])
)
manifest.action = {
  ...(manifest.action ?? {}),
  default_title: "PIT Collect 1.1.0",
  default_popup: "popup.html",
}
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

const backgroundPath = path.join(outputDir, "background.js")
const background = fs.readFileSync(backgroundPath, "utf8")
  .replace(/__COOKIE_SERVICE_URL__/g, cookieServiceUrl)
  .replace(/__COOKIE_SERVICE_SECRET__/g, cookieServiceSecret)
fs.writeFileSync(backgroundPath, background)

console.log("PIT Collect 1.1.0 gerada em:", outputDir)
console.log("Cookie service:", cookieServiceUrl)
console.log("Carregue esta pasta em chrome://extensions ou edge://extensions com Modo de desenvolvedor ativado.")
