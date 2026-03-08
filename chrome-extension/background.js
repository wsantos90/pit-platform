/**
 * PIT Collect — Background Service Worker (Manifest V3)
 *
 * Responsabilidades:
 *  1. Ouvir mensagens do painel admin do PIT
 *  2. Ler cookies Akamai do domínio EA
 *  3. Buscar partidas na EA API com esses cookies
 *  4. Enviar dados brutos ao backend PIT para parsing + persistência
 *  5. Reportar progresso de volta à página
 */

const EA_BASE_URL = "https://proclubs.ea.com/api/fc";
const EA_PLATFORM = "common-gen5";
const EA_COOKIE_DOMAIN = ".ea.com";
const MAX_RETRIES = 2;

// ─── Cookies ─────────────────────────────────────────────────────────────────

async function getEACookieHeader() {
  const cookies = await chrome.cookies.getAll({ domain: EA_COOKIE_DOMAIN });
  if (cookies.length === 0) return null;
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

// ─── EA API fetch ─────────────────────────────────────────────────────────────

async function fetchEAMatchesRaw(clubId, cookieHeader) {
  const url = `${EA_BASE_URL}/clubs/matches?platform=${EA_PLATFORM}&clubIds=${clubId}&maxResultCount=10&matchType=friendlyMatch`;

  let lastError = new Error("Unknown error");

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, attempt * 1000));
    }

    try {
      const headers = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      };
      if (cookieHeader) headers["Cookie"] = cookieHeader;

      const resp = await fetch(url, { headers });

      // Não faz retry em 403 — Akamai bloqueou definitivamente para essa sessão
      if (resp.status === 403) {
        throw new Error(`EA API respondeu 403 Forbidden para clubId=${clubId}`);
      }

      if (!resp.ok) {
        throw new Error(`EA API respondeu ${resp.status} ${resp.statusText}`);
      }

      return await resp.json();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Não retry em 403
      if (lastError.message.includes("403")) break;
    }
  }

  throw lastError;
}

// ─── Backend ingest ───────────────────────────────────────────────────────────

async function ingestClub(backendBase, runId, token, eaClubId, rawData) {
  const url = `${backendBase}/api/collect/tournament-run/${runId}/ingest`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-collect-token": token,
    },
    body: JSON.stringify({ ea_club_id: eaClubId, success: true, raw_data: rawData }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Ingest falhou ${resp.status}: ${text}`);
  }
  return resp.json();
}

async function ingestClubFailure(backendBase, runId, token, eaClubId, errorMsg) {
  const url = `${backendBase}/api/collect/tournament-run/${runId}/ingest`;
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-collect-token": token,
    },
    body: JSON.stringify({ ea_club_id: eaClubId, success: false, error: errorMsg }),
  }).catch((err) => {
    console.error(`[PIT Collect] Falha ao reportar erro para ${eaClubId}:`, err);
  });
}

// ─── State (popup) ────────────────────────────────────────────────────────────

async function saveState(patch) {
  const prev = await chrome.storage.local.get("pitState").then((r) => r.pitState ?? {});
  await chrome.storage.local.set({ pitState: { ...prev, ...patch } });
}

async function loadState() {
  const result = await chrome.storage.local.get("pitState");
  return result.pitState ?? null;
}

// ─── Mensagem principal ───────────────────────────────────────────────────────

chrome.runtime.onMessageExternal.addListener(
  async (message, _sender, sendResponse) => {
    if (message.type === "PING") {
      sendResponse({ ok: true });
      return true;
    }

    if (message.type === "GET_STATE") {
      const state = await loadState();
      sendResponse({ ok: true, state });
      return true;
    }

    if (message.type !== "START_COLLECT") {
      sendResponse({ ok: false, error: "unknown_message_type" });
      return true;
    }

    const { runId, token, targets, backendBase } = message;

    if (!runId || !token || !Array.isArray(targets) || targets.length === 0) {
      sendResponse({ ok: false, error: "invalid_payload" });
      return true;
    }

    const base = backendBase || "https://pit-platform.vercel.app";

    // Responde imediatamente — processamento é assíncrono
    sendResponse({ ok: true, total: targets.length });

    await saveState({
      phase: "running",
      runId,
      startedAt: new Date().toISOString(),
      total: targets.length,
      processed: 0,
      failed: 0,
      matches_new: 0,
      clubs: targets.map((id) => ({ ea_club_id: id, status: "pending" })),
      lastRawSample: null,
    });

    const cookieHeader = await getEACookieHeader();
    const results = { success: 0, failed: 0, matches_new: 0 };

    for (const eaClubId of targets) {
      try {
        const rawData = await fetchEAMatchesRaw(eaClubId, cookieHeader);
        const ingestResult = await ingestClub(base, runId, token, eaClubId, rawData);

        results.success += 1;
        results.matches_new += ingestResult.matches_new ?? 0;

        // Persiste estado e amostra dos dados brutos (último clube bem-sucedido)
        const current = await loadState();
        const clubs = (current?.clubs ?? []).map((c) =>
          c.ea_club_id === eaClubId
            ? { ...c, status: "success", matches_new: ingestResult.matches_new ?? 0 }
            : c
        );
        await saveState({
          processed: results.success,
          matches_new: results.matches_new,
          clubs,
          lastRawSample: { ea_club_id: eaClubId, data: rawData },
        });

        // Notifica a página do progresso (se ainda estiver aberta)
        chrome.runtime.sendMessage({
          type: "COLLECT_PROGRESS",
          runId,
          eaClubId,
          status: "success",
          matches_new: ingestResult.matches_new ?? 0,
        }).catch(() => {});
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        results.failed += 1;

        await ingestClubFailure(base, runId, token, eaClubId, errorMsg);

        const current = await loadState();
        const clubs = (current?.clubs ?? []).map((c) =>
          c.ea_club_id === eaClubId ? { ...c, status: "failed", error: errorMsg } : c
        );
        await saveState({ failed: results.failed, clubs });

        chrome.runtime.sendMessage({
          type: "COLLECT_PROGRESS",
          runId,
          eaClubId,
          status: "failed",
          error: errorMsg,
        }).catch(() => {});
      }
    }

    await saveState({ phase: "done", finishedAt: new Date().toISOString(), results });

    chrome.runtime.sendMessage({
      type: "COLLECT_DONE",
      runId,
      results,
    }).catch(() => {});
  }
);
