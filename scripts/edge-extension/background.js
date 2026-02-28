// PIT Cookie Sync — background service worker
// Gerado por create-edge-extension.js

const COOKIE_SERVICE_URL = "https://cookie.menteembeta.com.br";
const COOKIE_SERVICE_SECRET = "unB5kZV_CuVc97urPyWIBxGCjKX27O7Vd0MSmr4VZeLeryTiboMye90L6QLzmF8Q";
const EA_DOMAIN = 'proclubs.ea.com';
const ALARM_NAME = 'pit-cookie-sync';
const INTERVAL_MINUTES = 19;

async function syncCookies() {
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  console.log('[PIT] ' + now + ' — Sincronizando cookies EA...');

  // chrome.cookies pode ler cookies HttpOnly — privilegio exclusivo de extensoes
  const [ak_bmsc, bm_sv] = await Promise.all([
    chrome.cookies.get({ url: 'https://' + EA_DOMAIN, name: 'ak_bmsc' }),
    chrome.cookies.get({ url: 'https://' + EA_DOMAIN, name: 'bm_sv' }),
  ]);

  if (!ak_bmsc?.value) {
    console.warn('[PIT] ak_bmsc nao encontrado. Visite https://' + EA_DOMAIN + ' no Edge.');
    return;
  }
  if (!bm_sv?.value) {
    console.warn('[PIT] bm_sv nao encontrado. Acesse a API do EA no Edge para gerar o cookie.');
    return;
  }

  try {
    const response = await fetch(COOKIE_SERVICE_URL + '/api/cookies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-secret': COOKIE_SERVICE_SECRET,
      },
      body: JSON.stringify({ ak_bmsc: ak_bmsc.value, bm_sv: bm_sv.value }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('[PIT] ✅ Cookie service atualizado:', JSON.stringify(result));
    } else {
      const body = await response.text();
      console.error('[PIT] ❌ Cookie service erro ' + response.status + ':', body);
    }
  } catch (err) {
    console.error('[PIT] ❌ Falha na requisicao:', err.message);
  }
}

// Sincronizar ao iniciar o Edge
syncCookies();

// Agendar sincronizacao periodica
chrome.alarms.create(ALARM_NAME, { periodInMinutes: INTERVAL_MINUTES });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) syncCookies();
});

// Log de inicializacao
console.log('[PIT] Cookie Sync iniciado. Intervalo: ' + INTERVAL_MINUTES + ' min');
