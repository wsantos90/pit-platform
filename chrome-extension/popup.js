// popup.js — PIT Collect popup UI

const KEY_COOKIES = ["ak_bmsc", "bm_sv", "AKA_A2", "TS01", "EDGESCAPE_COUNTRY"];

function setStatus(phase) {
  const dot = document.getElementById("statusDot");
  const label = document.getElementById("statusLabel");
  dot.className = "status-dot " + (phase === "running" ? "live" : phase === "done" ? "done" : phase === "failed" ? "failed" : "idle");
  label.className = "status-label " + (phase === "running" ? "live" : phase === "done" ? "done" : phase === "failed" ? "failed" : "");
  const texts = { idle: "Aguardando", running: "Ao vivo", done: "Concluído", failed: "Com falhas" };
  label.textContent = texts[phase] ?? "Aguardando";
}

function formatTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function maskValue(v) {
  if (!v || v.length <= 12) return v;
  return v.slice(0, 6) + "…" + v.slice(-6);
}

async function renderCookies() {
  const cookieSection = document.getElementById("cookieSection");
  if (!cookieSection) return;

  let all = [];
  try {
    all = await chrome.cookies.getAll({ domain: ".ea.com" });
  } catch (_) {
    cookieSection.innerHTML = '<div class="section-title">Cookies EA</div><div class="stat-label" style="font-size:11px">Sem acesso</div>';
    return;
  }

  const found = KEY_COOKIES.map((name) => {
    const c = all.find((x) => x.name === name);
    return { name, value: c?.value ?? null, expires: c?.expirationDate ? new Date(c.expirationDate * 1000) : null };
  });

  const hasAkamai = found.some((c) => (c.name === "ak_bmsc" || c.name === "bm_sv") && c.value);
  const totalEA = all.length;

  let html = '<div class="section-title" style="display:flex;align-items:center;gap:6px">';
  html += `<span>Cookies EA</span>`;
  html += `<span style="margin-left:auto;font-size:10px;color:${hasAkamai ? "#3fb950" : "#f85149"}">${hasAkamai ? "✓ Akamai ok" : "✗ Akamai ausente"}</span>`;
  html += "</div>";
  html += `<div class="stat-row" style="margin-bottom:4px"><span class="stat-label">Total no domínio</span><span class="stat-value">${totalEA}</span></div>`;

  html += '<div class="cookie-list">';
  for (const c of found) {
    const present = Boolean(c.value);
    const exp = c.expires ? `exp ${c.expires.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "";
    html += `<div class="cookie-row">`;
    html += `<span class="cookie-dot" style="background:${present ? "#3fb950" : "#30363d"}"></span>`;
    html += `<span class="cookie-name">${c.name}</span>`;
    if (present) {
      html += `<span class="cookie-val" title="${c.value}">${maskValue(c.value)}</span>`;
      if (exp) html += `<span class="cookie-exp">${exp}</span>`;
    } else {
      html += `<span class="cookie-exp">não encontrado</span>`;
    }
    html += `</div>`;
  }
  html += "</div>";

  if (!hasAkamai) {
    html += `<p style="margin-top:6px;font-size:10px;color:#8b949e">Acesse <a href="https://www.ea.com" target="_blank" style="color:#58a6ff">ea.com</a> ou <a href="https://proclubs.ea.com" target="_blank" style="color:#58a6ff">proclubs.ea.com</a> para gerar os cookies Akamai.</p>`;
  }

  cookieSection.innerHTML = html;
}

function renderState(state) {
  const content = document.getElementById("content");

  if (!state) {
    setStatus("idle");
    content.innerHTML = `
      <div id="cookieSection" class="section"></div>
      <div class="section">
        <div class="empty" style="padding:12px 0">Nenhuma coleta realizada ainda.<br/>Use o painel admin para iniciar.</div>
      </div>`;
    renderCookies();
    return;
  }

  const phase = state.phase ?? "idle";
  setStatus(phase);

  const clubs = state.clubs ?? [];
  const results = state.results ?? {};

  let html = "";

  // ── Cookies EA ──────────────────────────────────────────────────────────────
  html += '<div id="cookieSection" class="section"></div>';

  // ── Resumo ─────────────────────────────────────────────────────────────────
  html += '<div class="section">';
  html += '<div class="section-title">Última coleta</div>';

  if (phase === "running") {
    html += `<div class="stat-row"><span class="stat-label">Iniciado às</span><span class="stat-value">${formatTime(state.startedAt)}</span></div>`;
    html += `<div class="stat-row"><span class="stat-label">Progresso</span><span class="stat-value blue">${(state.processed ?? 0) + (state.failed ?? 0)} / ${state.total ?? clubs.length}</span></div>`;
    html += `<div class="stat-row"><span class="stat-label">Partidas novas</span><span class="stat-value green">+${state.matches_new ?? 0}</span></div>`;
    if ((state.failed ?? 0) > 0) html += `<div class="stat-row"><span class="stat-label">Falhos</span><span class="stat-value red">${state.failed}</span></div>`;
  } else if (phase === "done") {
    html += `<div class="stat-row"><span class="stat-label">Concluído às</span><span class="stat-value">${formatTime(state.finishedAt)}</span></div>`;
    html += `<div class="stat-row"><span class="stat-label">Clubes coletados</span><span class="stat-value green">${results.success ?? 0}</span></div>`;
    html += `<div class="stat-row"><span class="stat-label">Partidas novas</span><span class="stat-value blue">${results.matches_new ?? 0}</span></div>`;
    if ((results.failed ?? 0) > 0) html += `<div class="stat-row"><span class="stat-label">Falhos</span><span class="stat-value red">${results.failed}</span></div>`;
  }

  html += "</div>";

  // ── Clubes ─────────────────────────────────────────────────────────────────
  if (clubs.length > 0) {
    html += '<div class="section">';
    html += '<div class="section-title">Clubes</div>';
    html += '<ul class="club-list">';
    for (const club of clubs) {
      const dotClass = club.status === "success" ? "success" : club.status === "failed" ? "failed" : "pending";
      const newBadge = club.status === "success" ? `<span class="club-new">+${club.matches_new ?? 0}</span>` : "";
      html += `<li class="club-item"><span class="club-dot ${dotClass}"></span><span class="club-id" title="${club.ea_club_id}">${club.ea_club_id}</span>${newBadge}</li>`;
    }
    html += "</ul></div>";
  }

  // ── Dados brutos ────────────────────────────────────────────────────────────
  if (state.lastRawSample) {
    html += '<div class="section">';
    html += '<div class="section-title" style="display:flex;align-items:center;justify-content:space-between;">';
    html += `<span>Última resposta EA</span><button class="raw-toggle" id="rawToggle">mostrar</button>`;
    html += "</div>";
    html += `<div class="raw-box" id="rawBox" style="display:none">${JSON.stringify(state.lastRawSample.data, null, 2)}</div>`;
    html += "</div>";
  }

  content.innerHTML = html;
  renderCookies();

  const rawToggle = document.getElementById("rawToggle");
  const rawBox = document.getElementById("rawBox");
  if (rawToggle && rawBox) {
    rawToggle.addEventListener("click", () => {
      const visible = rawBox.style.display !== "none";
      rawBox.style.display = visible ? "none" : "block";
      rawToggle.textContent = visible ? "mostrar" : "ocultar";
    });
  }
}

async function load() {
  const result = await chrome.storage.local.get("pitState");
  renderState(result.pitState ?? null);
}

load();

chrome.storage.onChanged.addListener((changes) => {
  if (changes.pitState) renderState(changes.pitState.newValue ?? null);
});
